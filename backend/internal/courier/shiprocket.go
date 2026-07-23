package courier

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
)

const apiBase = "https://apiv2.shiprocket.in/v1/external"

var ErrNotConfigured = errors.New("courier aggregator not configured; add courier details manually")

// Shiprocket hands orders to the aggregator rails. Optional: when creds are
// missing the seller assigns couriers manually.
type Shiprocket struct {
	email    string
	password string
	rdb      *redis.Client
	hc       *http.Client
}

func New(email, password string, rdb *redis.Client) *Shiprocket {
	return &Shiprocket{email: email, password: password, rdb: rdb, hc: &http.Client{Timeout: 20 * time.Second}}
}

func (s *Shiprocket) Enabled() bool { return s.email != "" && s.password != "" }

type ShipmentItem struct {
	Name  string
	Qty   int
	Price int // paise
}

type ShipmentInput struct {
	OrderCode    string
	CustomerName string
	Phone        string
	AddressLine  string
	City         string
	State        string
	Pincode      string
	Cod          bool
	Total        int // paise
	Items        []ShipmentItem
}

type ShipmentResult struct {
	ShiprocketOrderID string
	ShipmentID        string
}

// CreateShipment registers the order with Shiprocket "adhoc" channel.
func (s *Shiprocket) CreateShipment(ctx context.Context, in ShipmentInput) (*ShipmentResult, error) {
	if !s.Enabled() {
		return nil, ErrNotConfigured
	}
	token, err := s.token(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]map[string]any, len(in.Items))
	for i, it := range in.Items {
		items[i] = map[string]any{
			"name": it.Name, "sku": fmt.Sprintf("%s-%d", in.OrderCode, i+1),
			"units": it.Qty, "selling_price": float64(it.Price) / 100,
		}
	}
	method := "Prepaid"
	if in.Cod {
		method = "COD"
	}
	body, _ := json.Marshal(map[string]any{
		"order_id":              in.OrderCode,
		"order_date":            time.Now().Format("2006-01-02 15:04"),
		"billing_customer_name": in.CustomerName,
		"billing_last_name":     "",
		"billing_address":       in.AddressLine,
		"billing_city":          in.City,
		"billing_state":         in.State,
		"billing_pincode":       in.Pincode,
		"billing_country":       "India",
		"billing_phone":         in.Phone,
		"shipping_is_billing":   true,
		"payment_method":        method,
		"sub_total":             float64(in.Total) / 100,
		"order_items":           items,
		"length":                10, "breadth": 10, "height": 5, "weight": 0.5,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBase+"/orders/create/adhoc", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := s.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("shiprocket create failed: %s", raw)
	}
	var out struct {
		OrderID    json.Number `json:"order_id"`
		ShipmentID json.Number `json:"shipment_id"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, errors.New("shiprocket returned unexpected response")
	}
	return &ShipmentResult{ShiprocketOrderID: out.OrderID.String(), ShipmentID: out.ShipmentID.String()}, nil
}

// Serviceability reports whether couriers deliver to a pincode — a wrong or
// unserviceable address is a top RTO cause, so checkout checks before it sells.
// Checked is false when no aggregator is configured; callers must not block on it.
type Serviceability struct {
	Serviceable   bool `json:"serviceable"`
	CodAvailable  bool `json:"codAvailable"`
	EstimatedDays int  `json:"estimatedDays"`
	Checked       bool `json:"checked"`
}

func (s *Shiprocket) Serviceability(ctx context.Context, pickup, delivery string, cod bool) (*Serviceability, error) {
	if !s.Enabled() || pickup == "" {
		return &Serviceability{Serviceable: true, CodAvailable: true}, nil
	}
	key := fmt.Sprintf("courier:serv:%s:%s:%t", pickup, delivery, cod)
	var out Serviceability
	if raw, err := s.rdb.Get(ctx, key).Bytes(); err == nil && json.Unmarshal(raw, &out) == nil {
		return &out, nil
	}

	token, err := s.token(ctx)
	if err != nil {
		return nil, err
	}
	codFlag := 0
	if cod {
		codFlag = 1
	}
	url := fmt.Sprintf("%s/courier/serviceability/?pickup_postcode=%s&delivery_postcode=%s&cod=%d&weight=0.5",
		apiBase, pickup, delivery, codFlag)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := s.hc.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("shiprocket serviceability failed: %s", raw)
	}
	var body struct {
		Data struct {
			Couriers []struct {
				Cod           json.Number `json:"cod"`
				EstimatedDays json.Number `json:"estimated_delivery_days"`
			} `json:"available_courier_companies"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		return nil, errors.New("shiprocket returned unexpected response")
	}
	out = Serviceability{Checked: true, Serviceable: len(body.Data.Couriers) > 0}
	for _, c := range body.Data.Couriers {
		if days, err := c.EstimatedDays.Int64(); err == nil && days > 0 && (out.EstimatedDays == 0 || int(days) < out.EstimatedDays) {
			out.EstimatedDays = int(days)
		}
		if n, err := c.Cod.Int64(); err == nil && n == 1 {
			out.CodAvailable = true
		}
	}
	cached, _ := json.Marshal(out)
	s.rdb.Set(ctx, key, cached, 24*time.Hour)
	return &out, nil
}

// token logs in and caches the auth token for 8 hours (Shiprocket tokens last 10 days).
func (s *Shiprocket) token(ctx context.Context) (string, error) {
	const key = "courier:shiprocket:token"
	if t, err := s.rdb.Get(ctx, key).Result(); err == nil && t != "" {
		return t, nil
	}
	body, _ := json.Marshal(map[string]string{"email": s.email, "password": s.password})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiBase+"/auth/login", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.hc.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil || out.Token == "" {
		return "", errors.New("shiprocket login failed")
	}
	s.rdb.Set(ctx, key, out.Token, 8*time.Hour)
	return out.Token, nil
}
