package product

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	products, err := h.svc.List(r.Context(), middleware.BusinessID(r.Context()), FilterFrom(r.URL.Query()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load products")
		return
	}
	if products == nil {
		products = []Product{}
	}
	httpx.OK(w, httpx.M{"products": products})
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	p, err := h.svc.Get(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"))
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, p)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpx.Bind(w, r, &in) {
		return
	}
	p, err := h.svc.Create(r.Context(), middleware.BusinessID(r.Context()), in)
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.Created(w, p)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpx.Bind(w, r, &in) {
		return
	}
	p, err := h.svc.Update(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in)
	if err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, p)
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id")); err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// SetStock toggles availability and/or sets the counted quantity
// (stockQty: -1 leaves the product untracked).
func (h *Handler) SetStock(w http.ResponseWriter, r *http.Request) {
	var in struct {
		InStock  *bool `json:"inStock"`
		StockQty *int  `json:"stockQty"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if in.InStock == nil && in.StockQty == nil {
		httpx.Err(w, http.StatusBadRequest, "inStock or stockQty is required")
		return
	}
	if err := h.svc.SetStock(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.InStock, in.StockQty); err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) SetTrending(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Trending bool `json:"trending"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.SetTrending(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Trending); err != nil {
		respondErr(w, err)
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// Bulk imports products from a JSON array or an uploaded CSV file. Rows are
// matched on SKU, so the same sheet uploaded twice updates stock instead of
// duplicating the catalog.
func (h *Handler) Bulk(w http.ResponseWriter, r *http.Request) {
	bizID := middleware.BusinessID(r.Context())
	var inputs []Input

	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
		if err := r.ParseMultipartForm(5 << 20); err != nil {
			httpx.Err(w, http.StatusBadRequest, "invalid upload")
			return
		}
		file, _, err := r.FormFile("file")
		if err != nil {
			httpx.Err(w, http.StatusBadRequest, "file field is required")
			return
		}
		defer file.Close()
		if inputs, err = ParseCSV(file); err != nil {
			httpx.Err(w, http.StatusBadRequest, err.Error())
			return
		}
	} else {
		var in struct {
			Products []Input `json:"products"`
		}
		if !httpx.Bind(w, r, &in) {
			return
		}
		inputs = in.Products
	}

	res, err := h.svc.Bulk(r.Context(), bizID, inputs)
	if err != nil {
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": err.Error(), "created": res.Created, "updated": res.Updated})
		return
	}
	httpx.Created(w, res)
}

// LowStock powers the restock queue: tracked products at or under ?threshold=.
func (h *Handler) LowStock(w http.ResponseWriter, r *http.Request) {
	threshold := 5
	if n, err := strconv.Atoi(r.URL.Query().Get("threshold")); err == nil && n >= 0 {
		threshold = n
	}
	products, err := h.svc.LowStock(r.Context(), middleware.BusinessID(r.Context()), threshold)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load low stock")
		return
	}
	if products == nil {
		products = []Product{}
	}
	httpx.OK(w, httpx.M{"products": products, "threshold": threshold})
}

func (h *Handler) CreateOffer(w http.ResponseWriter, r *http.Request) {
	var in Offer
	if !httpx.Bind(w, r, &in) {
		return
	}
	offer, err := h.svc.CreateOffer(r.Context(), middleware.BusinessID(r.Context()), in)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, offer)
}

func (h *Handler) ListOffers(w http.ResponseWriter, r *http.Request) {
	offers, err := h.svc.ListOffers(r.Context(), middleware.BusinessID(r.Context()))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load offers")
		return
	}
	if offers == nil {
		offers = []Offer{}
	}
	httpx.OK(w, httpx.M{"offers": offers})
}

func (h *Handler) SetOfferActive(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Active bool `json:"active"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.SetOfferActive(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.Active); err != nil {
		httpx.Err(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func respondErr(w http.ResponseWriter, err error) {
	if errors.Is(err, ErrNotFound) {
		httpx.Err(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.Err(w, http.StatusBadRequest, err.Error())
}
