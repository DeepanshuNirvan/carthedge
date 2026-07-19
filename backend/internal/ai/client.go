package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"carthedge/internal/config"
)

// Client talks to the configured LLM provider (openai | gemini, env-based).
type Client struct {
	provider string
	key      string
	model    string
	hc       *http.Client
}

func NewClient(cfg *config.Config) *Client {
	c := &Client{provider: cfg.AIProvider, hc: &http.Client{Timeout: 60 * time.Second}}
	if c.provider == "gemini" {
		c.key, c.model = cfg.GeminiKey, cfg.GeminiModel
	} else {
		c.provider = "openai"
		c.key, c.model = cfg.OpenAIKey, cfg.OpenAIModel
	}
	return c
}

func (c *Client) Configured() bool { return c.key != "" }

// Complete runs one system+user exchange; jsonMode asks for strict JSON output.
func (c *Client) Complete(ctx context.Context, system, user string, jsonMode bool) (string, error) {
	if !c.Configured() {
		return "", errors.New("AI provider not configured; set OPENAI_API_KEY or GEMINI_API_KEY")
	}
	if c.provider == "gemini" {
		return c.gemini(ctx, system, user, jsonMode)
	}
	return c.openai(ctx, system, user, jsonMode)
}

func (c *Client) openai(ctx context.Context, system, user string, jsonMode bool) (string, error) {
	payload := map[string]any{
		"model": c.model,
		"messages": []map[string]string{
			{"role": "system", "content": system},
			{"role": "user", "content": user},
		},
	}
	if jsonMode {
		payload["response_format"] = map[string]string{"type": "json_object"}
	}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.key)
	raw, err := c.do(req)
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

func (c *Client) gemini(ctx context.Context, system, user string, jsonMode bool) (string, error) {
	payload := map[string]any{
		"systemInstruction": map[string]any{"parts": []map[string]string{{"text": system}}},
		"contents":          []map[string]any{{"parts": []map[string]string{{"text": user}}}},
	}
	if jsonMode {
		payload["generationConfig"] = map[string]string{"responseMimeType": "application/json"}
	}
	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", c.model, c.key)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	raw, err := c.do(req)
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

func (c *Client) do(req *http.Request) ([]byte, error) {
	resp, err := c.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("%s api error (%d)", c.provider, resp.StatusCode)
	}
	return raw, nil
}

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
