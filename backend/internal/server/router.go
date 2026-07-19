package server

import (
	"log/slog"
	"net/http"
	"time"

	"carthedge/internal/ai"
	"carthedge/internal/analytics"
	"carthedge/internal/auth"
	"carthedge/internal/broadcast"
	"carthedge/internal/business"
	"carthedge/internal/config"
	"carthedge/internal/customer"
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
	PaySvc     *payment.Service
}

func New(d Deps) http.Handler {
	mux := http.NewServeMux()

	authed := middleware.Auth(d.Cfg.JWTSecret)
	active := middleware.Middleware(d.PlanSvc.RequireActive)
	byIP := func(name string, limit int, window time.Duration) middleware.Middleware {
		return middleware.RateLimit(d.Rdb, name, limit, window, middleware.ClientIP)
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
	handle("GET /api/v1/offers", d.Products.ListOffers, authed, active)
	handle("POST /api/v1/offers", d.Products.CreateOffer, authed, active)
	handle("PATCH /api/v1/offers/{id}", d.Products.SetOfferActive, authed, active)

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

	// customers
	handle("GET /api/v1/customers", d.Customers.List, authed, active)
	handle("GET /api/v1/customers/{id}", d.Customers.Get, authed, active)
	handle("PATCH /api/v1/customers/{id}", d.Customers.Patch, authed, active)

	// analytics & reports
	handle("GET /api/v1/dashboard", d.Analytics.Dashboard, authed, active)
	handle("GET /api/v1/analytics/sales", d.Analytics.Sales, authed, active)
	handle("GET /api/v1/analytics/products", d.Analytics.TopProducts, authed, active)
	handle("GET /api/v1/reports/monthly", d.Analytics.MonthlyReport, authed, active)

	// broadcasts
	handle("GET /api/v1/broadcasts", d.Broadcasts.List, authed, active)
	handle("POST /api/v1/broadcasts", d.Broadcasts.Create, authed, active)
	handle("POST /api/v1/broadcasts/{id}/send", d.Broadcasts.Send, authed, active)
	handle("DELETE /api/v1/broadcasts/{id}", d.Broadcasts.Delete, authed, active)

	// invoices
	handle("GET /api/v1/invoices", d.Invoices.List, authed, active)
	handle("POST /api/v1/invoices", d.Invoices.Create, authed, active)
	handle("GET /api/v1/invoices/{id}", d.Invoices.Get, authed, active)

	// AI order desk
	handle("POST /api/v1/ai/parse", d.AI.Parse, authed, active)
	handle("GET /api/v1/ai/drafts", d.AI.ListDrafts, authed, active)
	handle("POST /api/v1/ai/drafts/{id}/confirm", d.AI.Confirm, authed, active)
	handle("POST /api/v1/ai/drafts/{id}/discard", d.AI.Discard, authed, active)
	handle("POST /api/v1/ai/reply", d.AI.Reply, authed, active)

	// uploads
	handle("POST /api/v1/uploads", d.Uploads.Upload, authed, active)
	if d.Cfg.StorageDriver == "local" {
		mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(d.Cfg.UploadDir))))
	}

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
