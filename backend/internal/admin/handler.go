package admin

import (
	"encoding/json"
	"errors"
	"net/http"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	session, err := h.svc.Login(r.Context(), in.Email, in.Password)
	if errors.Is(err, ErrBadLogin) {
		httpx.Err(w, http.StatusUnauthorized, err.Error())
		return
	}
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "login failed")
		return
	}
	httpx.OK(w, session)
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.ChangePassword(r.Context(), middleware.AdminID(r.Context()), in.CurrentPassword, in.NewPassword); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) Overview(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.Overview(r.Context())
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load overview")
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) Businesses(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	q := r.URL.Query()
	rows, total, err := h.svc.Businesses(r.Context(), q.Get("search"), q.Get("status"), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load businesses")
		return
	}
	httpx.OK(w, httpx.M{"businesses": rows, "total": total})
}

func (h *Handler) BusinessDetail(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.BusinessDetail(r.Context(), r.PathValue("id"))
	if err != nil {
		httpx.Err(w, http.StatusNotFound, err.Error())
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) SetBusinessStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.SetBusinessStatus(r.Context(), r.PathValue("id"), in.Status); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) AssignPlan(w http.ResponseWriter, r *http.Request) {
	var in struct {
		PlanCode    string `json:"planCode"`
		CustomPrice *int   `json:"customPrice"`
		ExtendDays  int    `json:"extendDays"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.AssignPlan(r.Context(), r.PathValue("id"), in.PlanCode, in.CustomPrice, in.ExtendDays); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) Plans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.svc.Plans(r.Context())
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load plans")
		return
	}
	// capabilities is the vocabulary the plan editor picks entitlements from
	httpx.OK(w, httpx.M{"plans": plans, "capabilities": Capabilities})
}

func (h *Handler) CreatePlan(w http.ResponseWriter, r *http.Request) {
	var in PlanInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.CreatePlan(r.Context(), in); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, httpx.M{"ok": true})
}

func (h *Handler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	var in PlanInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.UpdatePlan(r.Context(), r.PathValue("id"), in); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) PlanRequests(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	rows, err := h.svc.PlanRequests(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load requests")
		return
	}
	httpx.OK(w, httpx.M{"requests": rows})
}

func (h *Handler) UpdatePlanRequest(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status    string `json:"status"`
		AdminNote string `json:"adminNote"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.UpdatePlanRequest(r.Context(), r.PathValue("id"), in.Status, in.AdminNote); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// Contact is the public marketing enquiry form.
func (h *Handler) Contact(w http.ResponseWriter, r *http.Request) {
	var in ContactInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.CreateContactMessage(r.Context(), in); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.Created(w, httpx.M{"ok": true})
}

func (h *Handler) ContactMessages(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	rows, err := h.svc.ContactMessages(r.Context(), r.URL.Query().Get("status"), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load enquiries")
		return
	}
	httpx.OK(w, httpx.M{"messages": rows})
}

func (h *Handler) UpdateContactMessage(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status    string `json:"status"`
		AdminNote string `json:"adminNote"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.UpdateContactMessage(r.Context(), r.PathValue("id"), in.Status, in.AdminNote); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) Payments(w http.ResponseWriter, r *http.Request) {
	limit, offset := httpx.Page(r)
	rows, err := h.svc.Payments(r.Context(), limit, offset)
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load payments")
		return
	}
	httpx.OK(w, httpx.M{"payments": rows})
}

func (h *Handler) Settings(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.Settings(r.Context())
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load settings")
		return
	}
	httpx.OK(w, out)
}

func (h *Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	var in map[string]json.RawMessage
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.UpdateSettings(r.Context(), in); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// Site is the public endpoint the CartHedge website reads its content from.
func (h *Handler) Site(w http.ResponseWriter, r *http.Request) {
	out, err := h.svc.Settings(r.Context())
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not load site content")
		return
	}
	httpx.OK(w, out)
}
