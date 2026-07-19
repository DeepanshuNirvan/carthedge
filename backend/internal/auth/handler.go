package auth

import (
	"errors"
	"net/http"

	"carthedge/internal/httpx"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var in RegisterInput
	if !httpx.Bind(w, r, &in) {
		return
	}
	if in.BusinessName == "" || in.OwnerName == "" {
		httpx.Err(w, http.StatusBadRequest, "businessName and ownerName are required")
		return
	}
	if !httpx.ValidEmail(in.Email) {
		httpx.Err(w, http.StatusBadRequest, "invalid email")
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	in.Phone = phone
	if len(in.Password) < 8 {
		httpx.Err(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	if in.Pincode != "" && !httpx.ValidPincode(in.Pincode) {
		httpx.Err(w, http.StatusBadRequest, "invalid pincode")
		return
	}
	session, err := h.svc.Register(r.Context(), in)
	if err != nil {
		if errors.Is(err, ErrEmailTaken) {
			httpx.Err(w, http.StatusConflict, err.Error())
			return
		}
		httpx.Err(w, http.StatusInternalServerError, "registration failed")
		return
	}
	httpx.Created(w, session)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	session, err := h.svc.Login(r.Context(), in.Email, in.Password)
	if err != nil {
		httpx.Err(w, http.StatusUnauthorized, err.Error())
		return
	}
	httpx.OK(w, session)
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var in struct {
		RefreshToken string `json:"refreshToken"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	tokens, err := h.svc.Refresh(r.Context(), in.RefreshToken)
	if err != nil {
		httpx.Err(w, http.StatusUnauthorized, err.Error())
		return
	}
	httpx.OK(w, tokens)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var in struct {
		RefreshToken string `json:"refreshToken"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	h.svc.Logout(r.Context(), in.RefreshToken)
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string `json:"email"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.ForgotPassword(r.Context(), in.Email); err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not process request")
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if len(in.Password) < 8 {
		httpx.Err(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	if err := h.svc.ResetPassword(r.Context(), in.Token, in.Password); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}
