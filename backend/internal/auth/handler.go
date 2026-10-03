package auth

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"carthedge/internal/httpx"
	"carthedge/internal/middleware"
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
	in.Email = strings.TrimSpace(in.Email)
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
	if msg := passwordProblem(in.Password); msg != "" {
		httpx.Err(w, http.StatusBadRequest, msg)
		return
	}
	if in.Pincode != "" && !httpx.ValidPincode(in.Pincode) {
		httpx.Err(w, http.StatusBadRequest, "invalid pincode")
		return
	}
	if in.WhatsApp != "" {
		whatsapp, ok := httpx.NormalizePhone(in.WhatsApp)
		if !ok {
			httpx.Err(w, http.StatusBadRequest, "invalid WhatsApp number")
			return
		}
		in.WhatsApp = whatsapp
	}
	in.Instagram = httpx.NormalizeHandle(in.Instagram)
	in.UpiID = strings.TrimSpace(in.UpiID)
	if in.UpiID != "" && !httpx.ValidUPI(in.UpiID) {
		httpx.Err(w, http.StatusBadRequest, "enter a UPI ID like yourname@okhdfcbank")
		return
	}
	session, err := h.svc.Register(r.Context(), in, middleware.ClientIP(r))
	switch {
	case err == nil:
		httpx.Created(w, session)
	case errors.Is(err, ErrEmailTaken), errors.Is(err, ErrTaken), errors.Is(err, ErrCodeTaken):
		httpx.Err(w, http.StatusConflict, err.Error())
	case errors.Is(err, ErrCodeInvalid):
		httpx.Err(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrUnverified):
		httpx.Err(w, http.StatusBadRequest, "verify your mobile number to start the trial")
	case errors.Is(err, ErrTrialLimit):
		httpx.Err(w, http.StatusTooManyRequests, err.Error())
	default:
		h.svc.log.Error("registration failed", "err", err)
		httpx.Err(w, http.StatusInternalServerError, "registration failed")
	}
}

// StoreCode answers the signup form's live availability check for the seller's
// public URL. Advisory only — Register re-validates and re-checks, so a client
// that skips this or lies about the result gains nothing.
func (h *Handler) StoreCode(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	status, err := h.svc.CheckStoreCode(r.Context(), q.Get("code"), q.Get("city"))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not check that store link")
		return
	}
	httpx.OK(w, status)
}

// SignupOtp sends the seller's mobile verification code. Without it the 15-day
// trial is issued to an unverified identity, which is how trial farming starts.
func (h *Handler) SignupOtp(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Phone string `json:"phone"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	if err := h.svc.SendSignupOtp(r.Context(), phone); err != nil {
		if errors.Is(err, ErrTaken) {
			httpx.Err(w, http.StatusConflict, err.Error())
			return
		}
		httpx.Err(w, http.StatusTooManyRequests, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) VerifySignupOtp(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Phone string `json:"phone"`
		Code  string `json:"code"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	phone, ok := httpx.NormalizePhone(in.Phone)
	if !ok {
		httpx.Err(w, http.StatusBadRequest, "invalid phone number")
		return
	}
	token, err := h.svc.VerifySignupOtp(r.Context(), phone, in.Code)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"phoneToken": token})
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
		// This endpoint is unauthenticated, so it must never echo the raw error.
		// It used to: during a database outage it answered a wrong-password 401
		// whose body carried the connection string — DB user, database name and
		// host IPs — to anyone who asked. Infra failures are now a plain 500.
		switch {
		case errors.Is(err, ErrBadLogin):
			httpx.Err(w, http.StatusUnauthorized, ErrBadLogin.Error())
		case errors.Is(err, ErrSuspended):
			httpx.Err(w, http.StatusForbidden, ErrSuspended.Error())
		default:
			slog.Error("login failed", "err", err)
			httpx.Err(w, http.StatusInternalServerError, "could not sign you in, try again in a moment")
		}
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
	if msg := passwordProblem(in.Password); msg != "" {
		httpx.Err(w, http.StatusBadRequest, msg)
		return
	}
	if err := h.svc.ResetPassword(r.Context(), in.Token, in.Password); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// ChangePassword is the signed-in seller setting a new password; every other
// device is signed out and this one gets fresh tokens.
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if msg := passwordProblem(in.NewPassword); msg != "" {
		httpx.Err(w, http.StatusBadRequest, msg)
		return
	}
	if in.NewPassword == in.CurrentPassword {
		httpx.Err(w, http.StatusBadRequest, "choose a new password, not the current one")
		return
	}
	tokens, err := h.svc.ChangePassword(r.Context(), middleware.BusinessID(r.Context()), in.CurrentPassword, in.NewPassword)
	if err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, tokens)
}

// EndOtherSessions signs out every other device.
func (h *Handler) EndOtherSessions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	tokens, err := h.svc.EndOtherSessions(ctx, middleware.BusinessID(ctx), middleware.BusinessCode(ctx))
	if err != nil {
		httpx.Err(w, http.StatusInternalServerError, "could not sign out other devices")
		return
	}
	httpx.OK(w, tokens)
}

// Export sends the seller everything they keep in CartHedge as a JSON file.
func (h *Handler) Export(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", `attachment; filename="carthedge-`+middleware.BusinessCode(ctx)+`-export.json"`)
	if err := h.svc.Export(ctx, middleware.BusinessID(ctx), w); err != nil {
		h.svc.log.Error("data export failed", "err", err)
	}
}

// DeleteAccount schedules the account for deletion (30 days to restore).
func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Password string `json:"password"`
		Confirm  string `json:"confirm"`
	}
	if !httpx.Bind(w, r, &in) {
		return
	}
	if err := h.svc.ScheduleDeletion(r.Context(), middleware.BusinessID(r.Context()), in.Password, in.Confirm); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

func (h *Handler) RestoreAccount(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Restore(r.Context(), middleware.BusinessID(r.Context())); err != nil {
		httpx.Err(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.OK(w, httpx.M{"ok": true})
}

// passwordProblem enforces the length rules; bcrypt refuses anything past 72
// bytes, which used to surface as a 500 "registration failed".
func passwordProblem(p string) string {
	switch {
	case len(p) < 8:
		return "password must be at least 8 characters"
	case len(p) > 72:
		return "password must be at most 72 characters"
	}
	return ""
}
