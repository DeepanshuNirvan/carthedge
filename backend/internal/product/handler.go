package product

import (
	"errors"
	"net/http"
	"strings"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	products, err := h.svc.List(r.Context(), middleware.BusinessID(r.Context()), q.Get("search"), q.Get("category"), q.Get("trending") == "true")
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

func (h *Handler) SetStock(w http.ResponseWriter, r *http.Request) {
	var in struct {
		InStock bool `json:"inStock"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.SetStock(r.Context(), middleware.BusinessID(r.Context()), r.PathValue("id"), in.InStock); err != nil {
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

// Bulk imports products from a JSON array or an uploaded CSV file.
func (h *Handler) Bulk(w http.ResponseWriter, r *http.Request) {
	bizID := middleware.BusinessID(r.Context())
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
		created, err := h.svc.BulkCSV(r.Context(), bizID, file)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": err.Error(), "created": created})
			return
		}
		httpx.Created(w, httpx.M{"created": created})
		return
	}
	var in struct {
		Products []Input `json:"products"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	created, err := h.svc.BulkJSON(r.Context(), bizID, in.Products)
	if err != nil {
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": err.Error(), "created": created})
		return
	}
	httpx.Created(w, httpx.M{"created": created})
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
