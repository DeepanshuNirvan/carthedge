package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"carthedge/internal/config"
)

// provider is one configured LLM endpoint. Both OpenAI and Gemini can be set at
// once: the first is used, the second is the failover.
type provider struct {
	name    string // openai | gemini
	key     string
	model   string
	baseURL string
}

// Client talks to the configured LLM providers. AI_PROVIDER picks which one
// leads (openai | gemini | auto); whichever keys exist are all usable, so a
// rate limit or an outage on one falls through to the other instead of losing
// the seller's order draft.
type Client struct {
	providers []provider
	hc        *http.Client
	log       *slog.Logger
}

func NewClient(cfg *config.Config, log *slog.Logger) *Client {
	// any OpenAI-compatible endpoint works here (Azure, OpenRouter, a local model)
	openai := provider{name: "openai", key: cfg.OpenAIKey, model: cfg.OpenAIModel, baseURL: cfg.OpenAIBase}
	gemini := []provider{{name: "gemini", key: cfg.GeminiKey, model: cfg.GeminiModel}}
	if cfg.GeminiFallbackModel != "" && cfg.GeminiFallbackModel != cfg.GeminiModel {
		// a second model has its own capacity and quota: "high demand" on one
		// rarely means the other is down too
		gemini = append(gemini, provider{name: "gemini", key: cfg.GeminiKey, model: cfg.GeminiFallbackModel})
	}

	order := append([]provider{openai}, gemini...)
	if cfg.AIProvider == "gemini" {
		order = append(gemini, openai)
	}
	c := &Client{hc: &http.Client{Timeout: 60 * time.Second}, log: log}
	for _, p := range order {
		if p.key != "" {
			c.providers = append(c.providers, p)
		}
	}
	return c
}

func (c *Client) Configured() bool { return len(c.providers) > 0 }

// Provider names the LLM that leads, for the boot log and the admin console.
func (c *Client) Provider() string {
	if !c.Configured() {
		return "none"
	}
	return c.providers[0].name
}

// Complete runs one system+user exchange; jsonMode asks for strict JSON output.
// Providers are tried in order and the last error is reported if all fail.
func (c *Client) Complete(ctx context.Context, system, user string, jsonMode bool) (string, error) {
	if !c.Configured() {
		return "", errors.New("AI provider not configured; set OPENAI_API_KEY or GEMINI_API_KEY")
	}
	var lastErr error
	for i, p := range c.providers {
		var out string
		// a busy or rate-limited model usually answers a few seconds later;
		// a buyer waiting a little beats a buyer getting nothing
		for attempt, wait := range []time.Duration{0, 2 * time.Second, 6 * time.Second} {
			if attempt > 0 {
				select {
				case <-ctx.Done():
					return "", ctx.Err()
				case <-time.After(wait):
				}
			}
			if p.name == "gemini" {
				out, lastErr = c.gemini(ctx, p, system, user, jsonMode)
			} else {
				out, lastErr = c.openai(ctx, p, system, user, jsonMode)
			}
			var busy *busyError
			if lastErr == nil || !errors.As(lastErr, &busy) {
				break
			}
		}
		if lastErr == nil {
			return out, nil
		}
		if ctx.Err() != nil {
			break // the caller gave up; a retry would only burn the next provider
		}
		if i < len(c.providers)-1 {
			c.log.Warn("ai provider failed, trying the next one", "provider", p.name, "model", p.model, "err", lastErr)
		}
	}
	return "", lastErr
}

func (c *Client) openai(ctx context.Context, p provider, system, user string, jsonMode bool) (string, error) {
	payload := map[string]any{
		"model": p.model,
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
	}
	if jsonMode {
		payload["response_format"] = map[string]string{"type": "json_object"}
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.key)
	raw, err := c.do(req, p.name)
	if err != nil {
		return "", err
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Choices) == 0 {
		return "", errors.New("openai returned unexpected response")
	}
	return out.Choices[0].Message.Content, nil
}

func (c *Client) gemini(ctx context.Context, p provider, system, user string, jsonMode bool) (string, error) {
	payload := map[string]any{
		"systemInstruction": map[string]any{"parts": []map[string]string{{"text": system}}},
		"contents":          []map[string]any{{"parts": []map[string]string{{"text": user}}}},
	}
	if jsonMode {
		payload["generationConfig"] = map[string]string{"responseMimeType": "application/json"}
	}
	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", p.model)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	// header, not ?key= — query strings end up in proxy and access logs
	req.Header.Set("x-goog-api-key", p.key)
	raw, err := c.do(req, p.name)
	if err != nil {
		return "", err
	}
	var out struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(raw, &out); err != nil || len(out.Candidates) == 0 || len(out.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("gemini returned unexpected response")
	}
	return out.Candidates[0].Content.Parts[0].Text, nil
}

func (c *Client) do(req *http.Request, providerName string) ([]byte, error) {
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode >= 300 {
		// the seller only ever sees the status code; without the provider's own
		// message here, a dead model or an exhausted quota is indistinguishable
		// from any other 4xx and costs an afternoon to tell apart
		c.log.Error("ai provider rejected the request", "provider", providerName,
			"status", resp.StatusCode, "body", string(raw))
		err := fmt.Errorf("%s api error (%d)", providerName, resp.StatusCode)
		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			return nil, &busyError{err}
		}
		return nil, err
	}
	return raw, nil
}

// busyError is a rate limit or a provider-side failure: worth a retry.
type busyError struct{ error }

func (e *busyError) Unwrap() error { return e.error }

// stripFences removes markdown code fences some models wrap JSON in.
func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	}
	return strings.TrimSpace(s)
}
