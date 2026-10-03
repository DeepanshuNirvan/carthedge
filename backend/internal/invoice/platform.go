package invoice

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"carthedge/internal/gst"
	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
	"carthedge/internal/shop"

	"github.com/jackc/pgx/v5"
)

// BillingProfile is CartHedge's own GST identity on the invoices it issues to
// sellers, edited by the admin (site_settings "billing").
type BillingProfile struct {
	LegalName string `json:"legalName"`
	GSTIN     string `json:"gstin"`
	Address   string `json:"address"`
	StateCode string `json:"stateCode"`
	SAC       string `json:"sac"`  // 998314: IT design and development services
	Rate      int    `json:"rate"` // GST percent on the plan, usually 18
	Email     string `json:"email"`
}

// Validate is run when the admin saves the profile.
func (b *BillingProfile) Validate() error {
	if b.GSTIN != "" && !gst.ValidGSTIN(b.GSTIN) {
		return errors.New("billing GSTIN is not valid")
	}
	if b.StateCode != "" {
		if _, ok := gst.States[b.StateCode]; !ok {
			return errors.New("billing state code is not valid")
		}
	}
	if b.SAC != "" && !shop.ValidHSN(b.SAC) {
		return errors.New("SAC must be 4, 6 or 8 digits")
	}
	if b.Rate < 0 || b.Rate > 28 {
		return errors.New("GST rate must be 0 to 28")
	}
	return nil
}

func loadProfile(ctx context.Context, q pgx.Tx) BillingProfile {
	p := BillingProfile{LegalName: "CartHedge", SAC: "998314", Rate: 18}
	var raw []byte
	if q.QueryRow(ctx, `select value from site_settings where key='billing'`).Scan(&raw) == nil {
		json.Unmarshal(raw, &p)
	}
	if p.GSTIN != "" {
		p.StateCode = gst.StateOfGSTIN(p.GSTIN)
	}
	return p
}

// IssuePlatformInvoice writes CartHedge's invoice for a subscription payment,
// inside the transaction that marks it paid. Plan prices include GST, so the
// tax is taken out of what the seller paid. Re-running it for the same
// payment does nothing.
func IssuePlatformInvoice(ctx context.Context, tx pgx.Tx, paymentID string) error {
	var bizID, planCode, planName string
	var amount int
	err := tx.QueryRow(ctx, `select p.business_id, p.amount, coalesce(p.notes->>'planCode', ''),
		coalesce((select name from plans where code = p.notes->>'planCode'), 'CartHedge')
		from payments p where p.id=$1 and p.kind='subscription'`, paymentID).Scan(&bizID, &amount, &planCode, &planName)
	if err != nil {
		return err
	}
	profile := loadProfile(ctx, tx)

	var buyer Party
	var gstin, city, state, pincode string
	var gstRaw []byte
	if err := tx.QueryRow(ctx, `select name, address, city, state, pincode, gstin, phone, gst_profile from businesses where id=$1`,
		bizID).Scan(&buyer.Name, &buyer.Address, &city, &state, &pincode, &gstin, &buyer.Phone, &gstRaw); err != nil {
		return err
	}
	var sellerGST shop.GST
	json.Unmarshal(gstRaw, &sellerGST)
	buyer.Address = joinAddr(buyer.Address, city, pincode)
	buyer.StateCode = gst.StateCode(state)
	if gstin != "" {
		buyer.GSTIN, buyer.LegalName, buyer.StateCode = gstin, sellerGST.LegalName, gst.StateOfGSTIN(gstin)
	}
	buyer.State = gst.States[buyer.StateCode]
	pos := buyer.StateCode
	if pos == "" {
		pos = profile.StateCode
	}

	doc := Doc{Type: "tax_invoice", Buyer: buyer, PlaceOfSupply: pos + " - " + gst.States[pos],
		Seller: Party{Name: "CartHedge", LegalName: profile.LegalName, Address: profile.Address, GSTIN: profile.GSTIN,
			StateCode: profile.StateCode, State: gst.States[profile.StateCode]},
		OrderCode: "Subscription", OrderDate: time.Now().UTC().Format(time.RFC3339), PaymentMethod: "prepaid"}
	rate := profile.Rate
	if profile.GSTIN == "" {
		doc.Type, rate = "invoice", 0 // not registered: no tax on the document
	}
	doc.Intra = pos == profile.StateCode
	doc.Lines = []Line{{Description: "CartHedge " + planName + " plan, 30 days", HSN: profile.SAC, Qty: 1, Rate: rate, Gross: amount}}
	splitLines(&doc)

	fy := gst.FY(time.Now())
	n, err := gst.NextSerial(ctx, tx, "platform:"+fy)
	if err != nil {
		return err
	}
	data, _ := json.Marshal(doc)
	_, err = tx.Exec(ctx, `insert into platform_invoices (business_id, payment_id, number, data, total)
		values ($1,$2,$3,$4::jsonb,$5) on conflict (payment_id) do nothing`,
		bizID, paymentID, gst.Number("CH", fy, n), string(data), amount)
	return err
}

// PlatformInvoices is the seller's billing history with CartHedge.
func (h *Handler) PlatformInvoices(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(), `select i.id, i.number, i.total, i.data,
		to_char(i.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		from platform_invoices i where i.business_id=$1 order by i.created_at desc limit 60`, middleware.BusinessID(r.Context()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load invoices")
		return
	}
	defer rows.Close()
	type row struct {
		ID        string `json:"id"`
		Number    string `json:"number"`
		Total     int    `json:"total"`
		Doc       Doc    `json:"doc"`
		CreatedAt string `json:"createdAt"`
	}
	out := []row{}
	for rows.Next() {
		var x row
		var raw []byte
		if rows.Scan(&x.ID, &x.Number, &x.Total, &raw, &x.CreatedAt) == nil {
			json.Unmarshal(raw, &x.Doc)
			out = append(out, x)
		}
	}
	httpx.OK(w, httpx.M{"invoices": out})
}
