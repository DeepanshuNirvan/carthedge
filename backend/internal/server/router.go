package server

import (
	"log/slog"
	"net/http"
	"time"

	"carthedge/internal/admin"
	"carthedge/internal/ai"
	"carthedge/internal/analytics"
	"carthedge/internal/auth"
	"carthedge/internal/broadcast"
	"carthedge/internal/business"
	"carthedge/internal/config"
	"carthedge/internal/customer"
	"carthedge/internal/events"
	"carthedge/internal/httpx"
	"carthedge/internal/invoice"
	"carthedge/internal/link"
	"carthedge/internal/middleware"
	"carthedge/internal/order"
	"carthedge/internal/payment"
	"carthedge/internal/plan"
	"carthedge/internal/product"
	"carthedge/internal/publicapi"
	"carthedge/internal/storage"

	"github.com/redis/go-redis/v9"
)

type Deps struct {
	Cfg        *config.Config
	Log        *slog.Logger
	Rdb        *redis.Client
	Auth       *auth.Handler
	Business   *business.Handler
	Plans      *plan.Handler
	PlanSvc    *plan.Service
	Products   *product.Handler
	Links      *link.Handler
	Orders     *order.Handler
	Customers  *customer.Handler
	Analytics  *analytics.Handler
	Broadcasts *broadcast.Handler
	Invoices   *invoice.Handler
	AI         *ai.Handler
	Uploads    *storage.Handler
	Public     *publicapi.Handler
	Admin      *admin.Handler
	PaySvc     *payment.Service
	Events     *events.Bus
}

func New(d Deps) http.Handler {
	mux := http.NewServeMux()

	authed := middleware.Auth(d.Cfg.JWTSecret)
	adminAuthed := middleware.AdminAuth(d.Cfg.JWTSecret)
	active := middleware.Middleware(d.PlanSvc.RequireActive)
	byIP := func(name string, limit int, window time.Duration) middleware.Middleware {
		return middleware.RateLimit(d.Rdb, name, limit, window, middleware.ClientIP)
	}
	byBusiness := func(name string, limit int, window time.Duration) middleware.Middleware {
		return middleware.RateLimit(d.Rdb, name, limit, window, middleware.BusinessKey)
	}

	handle := func(pattern string, fn http.HandlerFunc, mws ...middleware.Middleware) {
		mux.Handle(pattern, middleware.Chain(fn, mws...))
	}

	handle("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		httpx.OK(w, httpx.M{"status": "ok"})
	})

	// auth
	handle("POST /api/v1/auth/register", d.Auth.Register, byIP("register", 10, time.Minute))
	handle("POST /api/v1/auth/login", d.Auth.Login, byIP("login", 20, time.Minute))
	handle("POST /api/v1/auth/refresh", d.Auth.Refresh)
	handle("POST /api/v1/auth/logout", d.Auth.Logout)
	handle("POST /api/v1/auth/forgot-password", d.Auth.ForgotPassword, byIP("forgot", 5, time.Minute))
	handle("POST /api/v1/auth/reset-password", d.Auth.ResetPassword, byIP("reset", 10, time.Minute))

	// business profile & settings
	handle("GET /api/v1/business", d.Business.Get, authed)
	handle("PUT /api/v1/business", d.Business.Update, authed)
	handle("PUT /api/v1/business/payments", d.Business.UpdatePayments, authed)

	// plans & subscription (reachable when expired, so sellers can pay)
	handle("GET /api/v1/plans", d.Plans.List)
	handle("GET /api/v1/subscription", d.Plans.Current, authed)
	handle("POST /api/v1/subscription/checkout", d.Plans.Checkout, authed)
	handle("POST /api/v1/subscription/verify", d.Plans.Verify, authed)
	handle("POST /api/v1/subscription/cancel", d.Plans.Cancel, authed)
	handle("POST /api/v1/plans/custom-request", d.Plans.CustomRequest, authed)

	// catalog
	handle("GET /api/v1/products", d.Products.List, authed, active)
	handle("POST /api/v1/products", d.Products.Create, authed, active)
	handle("POST /api/v1/products/bulk", d.Products.Bulk, authed, active)
	handle("GET /api/v1/products/{id}", d.Products.Get, authed, active)
	handle("PUT /api/v1/products/{id}", d.Products.Update, authed, active)
	handle("DELETE /api/v1/products/{id}", d.Products.Delete, authed, active)
	handle("PATCH /api/v1/products/{id}/stock", d.Products.SetStock, authed, active)
	handle("PATCH /api/v1/products/{id}/trending", d.Products.SetTrending, authed, active)
	handle("GET /api/v1/products/low-stock", d.Products.LowStock, authed, active)
	offers := middleware.RequireFeature("offers")
	handle("GET /api/v1/offers", d.Products.ListOffers, authed, active, offers)
	handle("POST /api/v1/offers", d.Products.CreateOffer, authed, active, offers)
	handle("PATCH /api/v1/offers/{id}", d.Products.SetOfferActive, authed, active, offers)

	// links
	handle("GET /api/v1/links", d.Links.List, authed, active)
	handle("POST /api/v1/links", d.Links.Create, authed, active)
	handle("PATCH /api/v1/links/{id}", d.Links.SetActive, authed, active)

	// orders
	handle("GET /api/v1/orders", d.Orders.List, authed, active)
	handle("GET /api/v1/orders/board", d.Orders.Board, authed, active)
	handle("POST /api/v1/orders", d.Orders.Create, authed, active)
	handle("GET /api/v1/orders/{id}", d.Orders.Get, authed, active)
	handle("PATCH /api/v1/orders/{id}/status", d.Orders.SetStatus, authed, active)
	handle("POST /api/v1/orders/{id}/ship", d.Orders.Ship, authed, active)
	handle("POST /api/v1/orders/{id}/resend-confirmation", d.Orders.ResendCodConfirmation, authed, active)

	// live order board (SSE; EventSource passes the JWT as ?accessToken=)
	handle("GET /api/v1/events", func(w http.ResponseWriter, r *http.Request) {
		d.Events.Stream(w, r, middleware.BusinessID(r.Context()))
	}, authed, active)

	// customers
	handle("GET /api/v1/customers", d.Customers.List, authed, active)
	handle("GET /api/v1/customers/{id}", d.Customers.Get, authed, active)
	handle("PATCH /api/v1/customers/{id}", d.Customers.Patch, authed, active)

	// analytics & reports
	handle("GET /api/v1/dashboard", d.Analytics.Dashboard, authed, active)
	handle("GET /api/v1/analytics/sales", d.Analytics.Sales, authed, active)
	handle("GET /api/v1/analytics/products", d.Analytics.TopProducts, authed, active)
	handle("GET /api/v1/insights", d.Analytics.Insights, authed, active)
	handle("GET /api/v1/reports/monthly", d.Analytics.MonthlyReport, authed, active)

	// broadcasts
	broadcasts := middleware.RequireFeature("broadcasts")
	handle("GET /api/v1/broadcasts", d.Broadcasts.List, authed, active, broadcasts)
	handle("POST /api/v1/broadcasts", d.Broadcasts.Create, authed, active, broadcasts)
	handle("POST /api/v1/broadcasts/{id}/send", d.Broadcasts.Send, authed, active, broadcasts)
	handle("DELETE /api/v1/broadcasts/{id}", d.Broadcasts.Delete, authed, active, broadcasts)

	// invoices
	invoices := middleware.RequireFeature("invoices")
	handle("GET /api/v1/invoices", d.Invoices.List, authed, active, invoices)
	handle("POST /api/v1/invoices", d.Invoices.Create, authed, active, invoices)
	handle("GET /api/v1/invoices/{id}", d.Invoices.Get, authed, active, invoices)

	// AI order desk: gated by plan, and capped per seller because every call costs money
	aiFeature := middleware.RequireFeature("ai")
	handle("POST /api/v1/ai/parse", d.AI.Parse, authed, active, aiFeature, byBusiness("aiParse", 60, time.Minute))
	handle("GET /api/v1/ai/drafts", d.AI.ListDrafts, authed, active, aiFeature)
	handle("POST /api/v1/ai/drafts/{id}/confirm", d.AI.Confirm, authed, active, aiFeature)
	handle("POST /api/v1/ai/drafts/{id}/discard", d.AI.Discard, authed, active, aiFeature)
	handle("POST /api/v1/ai/reply", d.AI.Reply, authed, active,
		middleware.RequireFeature("aiReply"), byBusiness("aiReply", 60, time.Minute))

	// uploads
	handle("POST /api/v1/uploads", d.Uploads.Upload, authed, active)
	if d.Cfg.StorageDriver == "local" {
		mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(d.Cfg.UploadDir))))
	}

	// platform admin (CartHedge staff)
	handle("POST /api/v1/admin/login", d.Admin.Login, byIP("adminLogin", 10, time.Minute))
	handle("PUT /api/v1/admin/password", d.Admin.ChangePassword, adminAuthed)
	handle("GET /api/v1/admin/overview", d.Admin.Overview, adminAuthed)
	handle("GET /api/v1/admin/businesses", d.Admin.Businesses, adminAuthed)
	handle("GET /api/v1/admin/businesses/{id}", d.Admin.BusinessDetail, adminAuthed)
	handle("PATCH /api/v1/admin/businesses/{id}/status", d.Admin.SetBusinessStatus, adminAuthed)
	handle("POST /api/v1/admin/businesses/{id}/plan", d.Admin.AssignPlan, adminAuthed)
	handle("GET /api/v1/admin/plans", d.Admin.Plans, adminAuthed)
	handle("POST /api/v1/admin/plans", d.Admin.CreatePlan, adminAuthed)
	handle("PUT /api/v1/admin/plans/{id}", d.Admin.UpdatePlan, adminAuthed)
	handle("GET /api/v1/admin/plan-requests", d.Admin.PlanRequests, adminAuthed)
	handle("PATCH /api/v1/admin/plan-requests/{id}", d.Admin.UpdatePlanRequest, adminAuthed)
	handle("GET /api/v1/admin/payments", d.Admin.Payments, adminAuthed)
	handle("GET /api/v1/admin/settings", d.Admin.Settings, adminAuthed)
	handle("PUT /api/v1/admin/settings", d.Admin.UpdateSettings, adminAuthed)

	// CartHedge website content (public)
	handle("GET /api/v1/site", d.Admin.Site)

	// public storefront (browse + direct buy, no login)
	handle("GET /p/{businessCode}/store", d.Public.Store)
	handle("GET /p/{businessCode}/store/products", d.Public.StoreProducts)
	handle("GET /p/{businessCode}/store/products/{id}", d.Public.StoreProduct)
	handle("GET /p/{businessCode}/serviceability", d.Public.Serviceability, byIP("serviceability", 60, time.Minute))
	handle("POST /p/{businessCode}/store/order", d.Public.StoreOrder, byIP("order", 10, time.Minute))

	// buyer-facing public API (link checkout, no login)
	handle("GET /p/{businessCode}/{token}", d.Public.ResolveLink)
	handle("POST /p/{businessCode}/otp", d.Public.SendOtp, byIP("otp", 10, 10*time.Minute))
	handle("POST /p/{businessCode}/otp/verify", d.Public.VerifyOtp, byIP("otpVerify", 20, 10*time.Minute))
	handle("POST /p/{businessCode}/{token}/order", d.Public.CreateOrder, byIP("order", 10, time.Minute))
	handle("POST /p/{businessCode}/waitlist", d.Public.Waitlist, byIP("waitlist", 10, time.Minute))
	handle("GET /p/orders/{code}", d.Public.Track)
	handle("POST /p/orders/{code}/pay", d.Public.Pay, byIP("pay", 20, time.Minute))
	handle("POST /p/orders/{code}/confirm", d.Public.ConfirmCod, byIP("codConfirm", 20, time.Minute))
	handle("POST /p/payments/verify", d.Public.VerifyPayment, byIP("payVerify", 30, time.Minute))

	// razorpay webhook (platform account)
	handle("POST /webhooks/razorpay", d.PaySvc.Webhook)

	return middleware.Chain(mux,
		middleware.Recover(d.Log),
		middleware.CORS(d.Cfg.CORSOrigins),
		middleware.Logging(d.Log),
	)
}
