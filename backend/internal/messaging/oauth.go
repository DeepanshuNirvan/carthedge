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
)

// OAuth turns "paste your access token" into a normal login. The seller
// authorises CartHedge on Meta, we exchange the code for a long-lived token and
// discover the account id ourselves. Manual entry stays as the fallback for
// sellers whose accounts predate the app review.
//
// WhatsApp uses the Facebook dialog (Embedded Signup): the granted token names
// the WABA, and the WABA names the phone number the webhook routes on.
// Instagram uses Instagram Business Login, a separate app id and token host.

type OAuthConfig struct {
	AppID       string
	AppSecret   string
	IgAppID     string
	IgAppSecret string
	RedirectURL string // must match the value registered on the Meta app
	Version     string
}

func (c OAuthConfig) enabled(channel string) bool {
	if c.RedirectURL == "" {
		return false
	}
	if channel == "instagram" {
		return c.igID() != "" && c.igSecret() != ""
	}
	return c.AppID != "" && c.AppSecret != ""
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

// AuthorizeURL is where the seller is sent to grant access.
func (c OAuthConfig) AuthorizeURL(channel, state string) (string, error) {
	if !c.enabled(channel) {
		return "", errors.New("this connection is not configured yet — enter your account details manually")
	}
	q := url.Values{"redirect_uri": {c.RedirectURL}, "state": {state}, "response_type": {"code"}}
	switch channel {
	case "whatsapp":
		q.Set("client_id", c.AppID)
		q.Set("scope", "whatsapp_business_management,whatsapp_business_messaging")
		return "https://www.facebook.com/" + c.Version + "/dialog/oauth?" + q.Encode(), nil
	case "instagram":
		q.Set("client_id", c.igID())
		q.Set("scope", "instagram_business_basic,instagram_business_manage_messages")
		return "https://www.instagram.com/oauth/authorize?" + q.Encode(), nil
	}
	return "", errors.New("channel must be whatsapp or instagram")
}

// ExchangeCode completes the flow: code → long-lived token → account id.
func (c *Client) ExchangeCode(ctx context.Context, cfg OAuthConfig, channel, code string) (externalID, token, name string, err error) {
	if channel == "instagram" {
		return c.exchangeInstagram(ctx, cfg, code)
	}
	return c.exchangeWhatsApp(ctx, cfg, code)
}

func (c *Client) exchangeWhatsApp(ctx context.Context, cfg OAuthConfig, code string) (string, string, string, error) {
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	err := c.getJSON(ctx, "https://graph.facebook.com/"+cfg.Version+"/oauth/access_token?"+url.Values{
		"client_id": {cfg.AppID}, "client_secret": {cfg.AppSecret},
		"redirect_uri": {cfg.RedirectURL}, "code": {code},
	}.Encode(), &tok)
	if err != nil {
		return "", "", "", err
	}
	if tok.AccessToken == "" {
		return "", "", "", errors.New("Meta did not return an access token")
	}

	// the WABA the seller just granted is named in the token's granular scopes
	var debug struct {
		Data struct {
			GranularScopes []struct {
				Scope     string   `json:"scope"`
				TargetIDs []string `json:"target_ids"`
			} `json:"granular_scopes"`
		} `json:"data"`
	}
	if err := c.getJSON(ctx, "https://graph.facebook.com/"+cfg.Version+"/debug_token?"+url.Values{
		"input_token": {tok.AccessToken}, "access_token": {cfg.AppID + "|" + cfg.AppSecret},
	}.Encode(), &debug); err != nil {
		return "", "", "", err
	}
	waba := ""
	for _, s := range debug.Data.GranularScopes {
		if strings.HasPrefix(s.Scope, "whatsapp_business_") && len(s.TargetIDs) > 0 {
			waba = s.TargetIDs[0]
			break
		}
	}
	if waba == "" {
		return "", "", "", errors.New("no WhatsApp Business account was granted")
	}

	var numbers struct {
		Data []struct {
			ID           string `json:"id"`
			DisplayPhone string `json:"display_phone_number"`
			Verified     string `json:"verified_name"`
		} `json:"data"`
	}
	if err := c.getJSON(ctx, "https://graph.facebook.com/"+cfg.Version+"/"+waba+"/phone_numbers?"+url.Values{
		"access_token": {tok.AccessToken},
	}.Encode(), &numbers); err != nil {
		return "", "", "", err
	}
	if len(numbers.Data) == 0 {
		return "", "", "", errors.New("that WhatsApp Business account has no phone number yet")
	}

	// without this the WABA never delivers messages to our webhook
	if err := c.postForm(ctx, "https://graph.facebook.com/"+cfg.Version+"/"+waba+"/subscribed_apps",
		url.Values{"access_token": {tok.AccessToken}}); err != nil {
		return "", "", "", fmt.Errorf("could not subscribe to message webhooks: %w", err)
	}

	n := numbers.Data[0]
	label := n.Verified
	if label == "" {
		label = n.DisplayPhone
	}
	return n.ID, tok.AccessToken, label, nil
}

func (c *Client) exchangeInstagram(ctx context.Context, cfg OAuthConfig, code string) (string, string, string, error) {
	var short struct {
		AccessToken string `json:"access_token"`
		UserID      any    `json:"user_id"`
	}
	if err := c.postJSON(ctx, "https://api.instagram.com/oauth/access_token", url.Values{
		"client_id": {cfg.igID()}, "client_secret": {cfg.igSecret()},
		"grant_type": {"authorization_code"}, "redirect_uri": {cfg.RedirectURL}, "code": {code},
	}, &short); err != nil {
		return "", "", "", err
	}
	if short.AccessToken == "" {
		return "", "", "", errors.New("Instagram did not return an access token")
	}

	// short-lived tokens expire in an hour; the long-lived one lasts 60 days
	var long struct {
		AccessToken string `json:"access_token"`
	}
	if err := c.getJSON(ctx, "https://graph.instagram.com/access_token?"+url.Values{
		"grant_type": {"ig_exchange_token"}, "client_secret": {cfg.igSecret()},
		"access_token": {short.AccessToken},
	}.Encode(), &long); err != nil || long.AccessToken == "" {
		long.AccessToken = short.AccessToken // usable now, refreshed on reconnect
	}

	var me struct {
		ID       string `json:"id"`
		Username string `json:"username"`
	}
	if err := c.getJSON(ctx, "https://graph.instagram.com/me?"+url.Values{
		"fields": {"id,username"}, "access_token": {long.AccessToken},
	}.Encode(), &me); err != nil {
		return "", "", "", err
	}
	if me.ID == "" {
		return "", "", "", errors.New("could not read the Instagram account id")
	}
	return me.ID, long.AccessToken, me.Username, nil
}

// RefreshInstagram extends a long-lived Instagram token. Meta allows this once
// the token is at least 24 hours old and before it expires at 60 days; the
// sweep runs a week early so a transient failure still has room to retry.
func (c *Client) RefreshInstagram(ctx context.Context, token string) (string, time.Duration, error) {
	var out struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int64  `json:"expires_in"`
	}
	if err := c.getJSON(ctx, "https://graph.instagram.com/refresh_access_token?"+url.Values{
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
		return err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode >= 300 {
		var e struct {
			Error struct {
				Message string `json:"message"`
			} `json:"error"`
		}
		json.Unmarshal(body, &e)
		if e.Error.Message != "" {
			return errors.New(e.Error.Message)
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
