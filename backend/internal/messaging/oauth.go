package messaging

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"carthedge/internal/secure"
)

// OAuth turns "paste your access token" into a normal login. The seller
// authorises CartHedge on Meta, we exchange the code for a long-lived token and
// discover the account id ourselves. Manual entry stays as the fallback.
//
// Instagram uses Instagram Business Login: a full-page redirect to
// instagram.com, back to /oauth/meta/callback.
//
// WhatsApp uses Embedded Signup: Meta's own popup, opened by the Facebook JS
// SDK with a Facebook Login for Business configuration. The popup reports the
// WABA and phone number it created, and the code it returns exchanges for a
// business-integration token that does not expire. (A plain Facebook OAuth
// redirect returns a user token that dies within hours, which is why the
// earlier redirect flow could not work.)

type OAuthConfig struct {
	AppID       string
	AppSecret   string
	IgAppID     string
	IgAppSecret string
	RedirectURL string // must match the value registered on the Meta app
	Version     string
	// WAConfigID is the Facebook Login for Business configuration created in
	// the WhatsApp Embedded Signup builder. Blank = WhatsApp one-tap is off.
	WAConfigID string
}

func (c OAuthConfig) enabled(channel string) bool {
	if channel == "instagram" {
		return c.RedirectURL != "" && c.igID() != "" && c.igSecret() != ""
	}
	return c.AppID != "" && c.AppSecret != "" && c.WAConfigID != ""
}

// Instagram Login can use its own app credentials; fall back to the Meta app.
func (c OAuthConfig) igID() string {
	if c.IgAppID != "" {
		return c.IgAppID
	}
	return c.AppID
}

func (c OAuthConfig) igSecret() string {
	if c.IgAppSecret != "" {
		return c.IgAppSecret
	}
	return c.AppSecret
}

// instagramScopes are exactly what CartHedge uses: the account's identity and
// its DMs. App Review rejects permissions that are requested but not shown in
// use, so nothing else is asked for.
const instagramScopes = "instagram_business_basic,instagram_business_manage_messages"

// instagramWebhookFields are the per-account webhook subscriptions turned on
// at connect time. The same fields must be ticked in the app dashboard.
const instagramWebhookFields = "messages"

// AuthorizeURL is where the seller is sent to grant Instagram access.
func (c OAuthConfig) AuthorizeURL(channel, state string) (string, error) {
	if channel != "instagram" {
		return "", errors.New("only Instagram connects by redirect")
	}
	if !c.enabled(channel) {
		return "", errors.New("this connection is not configured yet — enter your account details manually")
	}
	q := url.Values{
		"client_id": {c.igID()}, "redirect_uri": {c.RedirectURL}, "state": {state},
		"response_type": {"code"}, "scope": {instagramScopes},
		// Instagram credentials only — a seller's Facebook session is irrelevant here
		"enable_fb_login": {"0"},
	}
	return "https://www.instagram.com/oauth/authorize?" + q.Encode(), nil
}

// Connection is what a successful connect hands to the service to store.
type Connection struct {
	Channel     string
	ExternalID  string // webhook routing key: IG professional account id / WA phone_number_id
	AltID       string // IG app-scoped id; also accepted as a routing key
	Token       string
	DisplayName string
	ExpiresAt   *time.Time // nil = the token does not expire
	BusinessID  string     // WhatsApp: the WABA id, kept for support
}

// flexID accepts an id Meta sends as a JSON string or as a bare number.
// Instagram ids exceed 2^53, so decoding one as a float would corrupt it.
type flexID string

func (f *flexID) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), `"`)
	if s == "null" {
		s = ""
	}
	*f = flexID(s)
	return nil
}

type igShortToken struct {
	AccessToken string `json:"access_token"`
	UserID      flexID `json:"user_id"`
}

// ExchangeInstagram completes Instagram Business Login: code → short-lived
// token → long-lived token → account ids → webhook subscription.
func (c *Client) ExchangeInstagram(ctx context.Context, cfg OAuthConfig, code string) (*Connection, error) {
	// Meta documents this response wrapped in a `data` array, and has served
	// it flat; accept both
	var short struct {
		igShortToken
		Data []igShortToken `json:"data"`
	}
	if err := c.postJSON(ctx, c.apiIG+"/oauth/access_token", url.Values{
		"client_id": {cfg.igID()}, "client_secret": {cfg.igSecret()},
		"grant_type": {"authorization_code"}, "redirect_uri": {cfg.RedirectURL}, "code": {code},
	}, &short); err != nil {
		return nil, err
	}
	if short.AccessToken == "" && len(short.Data) > 0 {
		short.igShortToken = short.Data[0]
	}
	if short.AccessToken == "" {
		return nil, errors.New("Instagram did not return an access token")
	}

	// the short-lived token dies in an hour and cannot be refreshed; storing it
	// would connect the seller and then silently stop. Fail now instead.
	var long struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := c.getJSON(ctx, c.graphIG+"/access_token?"+url.Values{
		"grant_type": {"ig_exchange_token"}, "client_secret": {cfg.igSecret()},
		"access_token": {short.AccessToken},
	}.Encode(), &long); err != nil {
		return nil, fmt.Errorf("Instagram would not issue a long-lived token: %w", err)
	}
	if long.AccessToken == "" {
		return nil, errors.New("Instagram would not issue a long-lived token")
	}
	ttl := instagramTokenTTL
	if long.ExpiresIn > 0 {
		ttl = time.Duration(long.ExpiresIn) * time.Second
	}
	expires := time.Now().Add(ttl)

	// `user_id` is the professional account id — the one webhooks carry in
	// entry.id. `id` is app-scoped and does not match it.
	var me struct {
		UserID   flexID `json:"user_id"`
		ID       flexID `json:"id"`
		Username string `json:"username"`
	}
	if err := c.getJSON(ctx, fmt.Sprintf("%s/%s/me?", c.graphIG, c.version)+url.Values{
		"fields": {"user_id,username"}, "access_token": {long.AccessToken},
	}.Encode(), &me); err != nil {
		return nil, err
	}
	conn := &Connection{Channel: "instagram", ExternalID: string(me.UserID), Token: long.AccessToken,
		DisplayName: me.Username, ExpiresAt: &expires}
	conn.AltID = firstNonEmpty(string(me.ID), string(short.UserID))
	if conn.ExternalID == "" {
		conn.ExternalID, conn.AltID = conn.AltID, ""
	}
	if conn.ExternalID == "" {
		return nil, errors.New("could not read the Instagram account id")
	}
	if conn.AltID == conn.ExternalID {
		conn.AltID = ""
	}
	if conn.DisplayName != "" {
		conn.DisplayName = "@" + conn.DisplayName
	}

	// Without this per-account subscription Meta never sends this seller's DMs
	// to the webhook, however the app dashboard is configured.
	if err := c.SubscribeInstagram(ctx, long.AccessToken); err != nil {
		return nil, fmt.Errorf("could not turn on message delivery for this account: %w", err)
	}
	return conn, nil
}

// SubscribeInstagram enables webhook delivery for one connected account.
func (c *Client) SubscribeInstagram(ctx context.Context, token string) error {
	var out struct {
		Success bool `json:"success"`
	}
	if err := c.postJSON(ctx, fmt.Sprintf("%s/%s/me/subscribed_apps", c.graphIG, c.version), url.Values{
		"subscribed_fields": {instagramWebhookFields}, "access_token": {token},
	}, &out); err != nil {
		return err
	}
	if !out.Success {
		return errors.New("Instagram refused the webhook subscription")
	}
	return nil
}

// RefreshInstagram extends a long-lived Instagram token. Meta allows this once
// the token is at least 24 hours old and before it expires at 60 days; the
// sweep runs a week early so a transient failure still has room to retry.
func (c *Client) RefreshInstagram(ctx context.Context, token string) (string, time.Duration, error) {
	var out struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := c.getJSON(ctx, c.graphIG+"/refresh_access_token?"+url.Values{
		"grant_type": {"ig_refresh_token"}, "access_token": {token},
	}.Encode(), &out); err != nil {
		return "", 0, err
	}
	if out.AccessToken == "" {
		return "", 0, errors.New("Instagram did not return a refreshed token")
	}
	ttl := instagramTokenTTL
	if out.ExpiresIn > 0 {
		ttl = time.Duration(out.ExpiresIn) * time.Second
	}
	return out.AccessToken, ttl, nil
}

// EmbeddedSignup is what the WhatsApp popup reports back to the browser.
type EmbeddedSignup struct {
	Code          string `json:"code"`
	WabaID        string `json:"wabaId"`
	PhoneNumberID string `json:"phoneNumberId"`
	// Coexistence: the seller kept the WhatsApp Business app on their phone.
	// That number is already live on WhatsApp and must not be re-registered.
	Coexistence bool `json:"coexistence"`
}

// ExchangeWhatsApp completes Embedded Signup: code → business token, then
// subscribes the WABA to our webhook and activates the number on Cloud API.
func (c *Client) ExchangeWhatsApp(ctx context.Context, cfg OAuthConfig, in EmbeddedSignup) (*Connection, error) {
	if !cfg.enabled("whatsapp") {
		return nil, errors.New("WhatsApp signup is not configured yet")
	}
	if in.Code == "" {
		return nil, errors.New("the WhatsApp signup did not finish")
	}
	// Embedded Signup codes are minted by the JS SDK popup, so there is no
	// redirect_uri to echo back
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := c.getJSON(ctx, fmt.Sprintf("%s/%s/oauth/access_token?", c.graphFB, cfg.Version)+url.Values{
		"client_id": {cfg.AppID}, "client_secret": {cfg.AppSecret}, "code": {in.Code},
	}.Encode(), &tok); err != nil {
		return nil, err
	}
	if tok.AccessToken == "" {
		return nil, errors.New("Meta did not return an access token")
	}

	waba := in.WabaID
	if waba == "" {
		// older popups do not post the session info; the token's granular
		// scopes name the WABA it was granted on
		var err error
		if waba, err = c.grantedWABA(ctx, cfg, tok.AccessToken); err != nil {
			return nil, err
		}
	}

	var numbers struct {
		Data []struct {
			ID           string `json:"id"`
			DisplayPhone string `json:"display_phone_number"`
			Verified     string `json:"verified_name"`
		} `json:"data"`
	}
	if err := c.getJSON(ctx, fmt.Sprintf("%s/%s/%s/phone_numbers?", c.graphFB, cfg.Version, waba)+url.Values{
		"access_token": {tok.AccessToken},
	}.Encode(), &numbers); err != nil {
		return nil, err
	}
	if len(numbers.Data) == 0 {
		return nil, errors.New("that WhatsApp Business account has no phone number yet")
	}
	n := numbers.Data[0]
	for _, candidate := range numbers.Data {
		if candidate.ID == in.PhoneNumberID {
			n = candidate
		}
	}

	// without this the WABA never delivers messages to our webhook
	if err := c.postForm(ctx, fmt.Sprintf("%s/%s/%s/subscribed_apps", c.graphFB, cfg.Version, waba),
		url.Values{"access_token": {tok.AccessToken}}); err != nil {
		return nil, fmt.Errorf("could not subscribe to message webhooks: %w", err)
	}

	// A fresh number must be registered on Cloud API before it can send. The
	// PIN becomes the number's two-step verification PIN; the seller never
	// needs it. A coexistence number is already registered by the app.
	if !in.Coexistence {
		if err := c.postForm(ctx, fmt.Sprintf("%s/%s/%s/register", c.graphFB, cfg.Version, n.ID), url.Values{
			"messaging_product": {"whatsapp"}, "pin": {secure.Digits(6)}, "access_token": {tok.AccessToken},
		}); err != nil {
			return nil, fmt.Errorf("could not activate the number on WhatsApp: %w", err)
		}
	}

	label := firstNonEmpty(n.Verified, n.DisplayPhone)
	return &Connection{Channel: "whatsapp", ExternalID: n.ID, Token: tok.AccessToken,
		DisplayName: label, BusinessID: waba}, nil
}

func (c *Client) grantedWABA(ctx context.Context, cfg OAuthConfig, token string) (string, error) {
	var debug struct {
		Data struct {
			GranularScopes []struct {
				Scope     string   `json:"scope"`
				TargetIDs []string `json:"target_ids"`
			} `json:"granular_scopes"`
		} `json:"data"`
	}
	if err := c.getJSON(ctx, fmt.Sprintf("%s/%s/debug_token?", c.graphFB, cfg.Version)+url.Values{
		"input_token": {token}, "access_token": {cfg.AppID + "|" + cfg.AppSecret},
	}.Encode(), &debug); err != nil {
		return "", err
	}
	for _, s := range debug.Data.GranularScopes {
		if strings.HasPrefix(s.Scope, "whatsapp_business_") && len(s.TargetIDs) > 0 {
			return s.TargetIDs[0], nil
		}
	}
	return "", errors.New("no WhatsApp Business account was granted")
}

func (c *Client) getJSON(ctx context.Context, url string, dst any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	return c.do(req, dst)
}

func (c *Client) postJSON(ctx context.Context, endpoint string, form url.Values, dst any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	return c.do(req, dst)
}

func (c *Client) postForm(ctx context.Context, endpoint string, form url.Values) error {
	var ignored map[string]any
	return c.postJSON(ctx, endpoint, form, &ignored)
}

func (c *Client) do(req *http.Request, dst any) error {
	res, err := c.hc.Do(req)
	if err != nil {
		// a *url.Error embeds the full URL, access token included — keep only the cause
		var ue *url.Error
		if errors.As(err, &ue) {
			err = ue.Err
		}
		return fmt.Errorf("could not reach Meta: %w", err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 300 {
		var e struct {
			Error struct {
				Message      string `json:"message"`
				ErrorMessage string `json:"error_message"` // api.instagram.com's shape
			} `json:"error"`
			ErrorMessage string `json:"error_message"`
		}
		json.Unmarshal(body, &e)
		if msg := firstNonEmpty(e.Error.Message, e.Error.ErrorMessage, e.ErrorMessage); msg != "" {
			return errors.New(msg)
		}
		return fmt.Errorf("meta returned %d", res.StatusCode)
	}
	return json.Unmarshal(body, dst)
}

// oauthStateTTL bounds how long an authorize redirect stays valid.
const oauthStateTTL = 10 * time.Minute

// instagramTokenTTL is how long Meta issues long-lived Instagram tokens for.
// WhatsApp business tokens do not expire, so only Instagram is swept.
const instagramTokenTTL = 60 * 24 * time.Hour
