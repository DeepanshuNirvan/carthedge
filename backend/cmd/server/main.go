package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"carthedge/internal/admin"
	"carthedge/internal/aftersale"
	"carthedge/internal/ai"
	"carthedge/internal/alert"
	"carthedge/internal/analytics"
	"carthedge/internal/auth"
	"carthedge/internal/broadcast"
	"carthedge/internal/business"
	"carthedge/internal/cache"
	"carthedge/internal/config"
	"carthedge/internal/courier"
	"carthedge/internal/customer"
	"carthedge/internal/database"
	"carthedge/internal/events"
	"carthedge/internal/invoice"
	"carthedge/internal/jobs"
	"carthedge/internal/link"
	"carthedge/internal/logger"
	"carthedge/internal/messaging"
	"carthedge/internal/notify"
	"carthedge/internal/order"
	"carthedge/internal/otp"
	"carthedge/internal/payment"
	"carthedge/internal/plan"
	"carthedge/internal/product"
	"carthedge/internal/publicapi"
	"carthedge/internal/secure"
	"carthedge/internal/server"
	"carthedge/internal/storage"
	"carthedge/internal/web"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		os.Stderr.WriteString("config: " + err.Error() + "\n")
		os.Exit(1)
	}
	log := logger.New(cfg.Env)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cipher, err := secure.NewCipher(cfg.EncryptionKey)
	if err != nil {
		log.Error("cipher init failed", "err", err)
		os.Exit(1)
	}

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("postgres connect failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool, log); err != nil {
		log.Error("migrations failed", "err", err)
		os.Exit(1)
	}

	rdb, err := cache.Connect(ctx, cfg.RedisURL)
	if err != nil {
		log.Error("redis connect failed", "err", err)
		os.Exit(1)
	}
	defer rdb.Close()

	store, err := storage.New(cfg)
	if err != nil {
		log.Error("storage init failed", "err", err)
		os.Exit(1)
	}

	notifier := notify.New(cfg, log)
	pusher, err := alert.NewPusher(cfg.EncryptionKey, pushSubject(cfg))
	if err != nil {
		log.Error("web push init failed", "err", err)
		os.Exit(1)
	}
	alerts := alert.New(pool, notifier, pusher, log, cfg.PublicBaseURL)
	otpSvc := otp.New(rdb, notifier)
	shiprocket := courier.New(cfg.ShiprocketEmail, cfg.ShiprocketPassword, rdb)
	platformRzp := payment.NewClient(cfg.RazorpayKeyID, cfg.RazorpayKeySecret)

	bus := events.New(rdb, log)
	customerSvc := customer.NewService(pool)
	productSvc := product.NewService(pool, notifier, log)
	orderSvc := order.NewService(pool, rdb, customerSvc, productSvc, notifier, alerts, shiprocket, bus, log, cfg.PublicBaseURL)
	linkSvc := link.NewService(pool, productSvc, cfg.PublicBaseURL)
	planSvc := plan.NewService(pool, rdb, cfg, platformRzp, notifier, log)
	paySvc := payment.NewService(pool, rdb, orderSvc, cipher, cfg, log)
	paySvc.SetSubscriptionEvents(planSvc.HandleRazorpayEvent)
	authSvc := auth.NewService(pool, rdb, cfg, notifier, otpSvc, log)
	authSvc.SetDeleteHook(func(ctx context.Context, bizID string) { planSvc.CancelAutopay(ctx, bizID) })
	afterSvc := aftersale.New(pool, orderSvc, alerts, notifier, cipher, bus, log, cfg.PublicBaseURL)
	afterSvc.SetCreditNoteIssuer(invoice.IssueCreditNote)
	// money already paid on a cancelled or RTO order becomes a refund due
	orderSvc.SetCloseHook(afterSvc.OnOrderClosed)
	broadcastSvc := broadcast.NewService(pool, notifier, log)
	broadcastSvc.StartScheduler(ctx)
	aiClient := ai.NewClient(cfg, log)
	aiSvc := ai.NewService(pool, aiClient, orderSvc, productSvc, log, cfg.PublicBaseURL)
	metaClient := messaging.NewClient(cfg.MetaGraphVersion, cfg.MetaAppSecret, cfg.MetaIgAppSecret)
	messagingSvc := messaging.NewService(pool, metaClient, aiSvc, bus, cipher, alerts, planSvc.HasFeature, log)
	messagingSvc.Start(ctx)
	// orders placed from a DM chat are confirmed and tracked on that chat
	orderSvc.SetDirectMessenger(messagingSvc.SendToConversation)
	jobs.New(pool, rdb, orderSvc, notifier, log, cfg.PublicBaseURL, jobs.Extra{
		PurgeDeleted: authSvc.PurgeDeleted, BillOverage: planSvc.BillOverage, HasFeature: planSvc.HasFeature,
	}).Start(ctx)
	adminSvc := admin.NewService(pool, rdb, cfg, notifier)
	adminSvc.SetAutopayCanceller(planSvc.CancelAutopay)
	uploads := storage.NewHandler(store)

	spa, err := web.New(pool, cfg.FrontendDir, cfg.PublicBaseURL, log)
	if err != nil {
		log.Error("frontend init failed", "err", err)
		os.Exit(1)
	}

	handler := server.New(server.Deps{
		Cfg: cfg, Log: log, Rdb: rdb,
		Auth:       auth.NewHandler(authSvc),
		Business:   business.NewHandler(pool, cipher),
		Plans:      plan.NewHandler(planSvc),
		PlanSvc:    planSvc,
		Products:   product.NewHandler(productSvc),
		Links:      link.NewHandler(linkSvc),
		Orders:     order.NewHandler(orderSvc),
		Customers:  customer.NewHandler(customerSvc),
		Analytics:  analytics.NewHandler(pool, rdb),
		Broadcasts: broadcast.NewHandler(broadcastSvc),
		Invoices:   invoice.NewHandler(pool),
		AI:         ai.NewHandler(aiSvc),
		Uploads:    uploads,
		Public: publicapi.NewHandler(pool, linkSvc, orderSvc, otpSvc, paySvc, planSvc, productSvc, customerSvc, shiprocket,
			afterSvc, uploads),
		Admin: admin.NewHandler(adminSvc),
		Messaging: messaging.NewHandler(messaging.HandlerDeps{
			Service: messagingSvc, Client: metaClient, Rdb: rdb,
			VerifyToken: cfg.MetaVerifyToken, JWTSecret: cfg.JWTSecret, AppBaseURL: cfg.PublicBaseURL,
			OAuth: messaging.OAuthConfig{
				AppID: cfg.MetaAppID, AppSecret: cfg.MetaAppSecret,
				IgAppID: cfg.MetaIgAppID, IgAppSecret: cfg.MetaIgAppSecret,
				RedirectURL: cfg.MetaOAuthRedirect, Version: cfg.MetaGraphVersion,
			},
		}),
		PaySvc:    paySvc,
		Alerts:    alerts,
		AfterSale: afterSvc,
		Events:    bus,
		Web:       spa,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  90 * time.Second,
	}

	go func() {
		log.Info("carthedge api listening", "port", cfg.Port, "env", cfg.Env, "storage", cfg.StorageDriver, "aiProvider", aiClient.Provider())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server failed", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
}

// pushSubject is the contact push services may use about our notifications
// (RFC 8292): a mailto or an https URL.
func pushSubject(cfg *config.Config) string {
	switch {
	case cfg.AdminEmail != "":
		return "mailto:" + cfg.AdminEmail
	case strings.HasPrefix(cfg.PublicBaseURL, "https://"):
		return cfg.PublicBaseURL
	}
	return "mailto:hello@carthedge.in"
}
