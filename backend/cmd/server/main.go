package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"carthedge/internal/admin"
	"carthedge/internal/ai"
	"carthedge/internal/analytics"
	"carthedge/internal/auth"
	"carthedge/internal/broadcast"
	"carthedge/internal/business"
	"carthedge/internal/cache"
	"carthedge/internal/config"
	"carthedge/internal/courier"
	"carthedge/internal/customer"
	"carthedge/internal/database"
	"carthedge/internal/invoice"
	"carthedge/internal/link"
	"carthedge/internal/logger"
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
	otpSvc := otp.New(rdb, notifier)
	shiprocket := courier.New(cfg.ShiprocketEmail, cfg.ShiprocketPassword, rdb)
	platformRzp := payment.NewClient(cfg.RazorpayKeyID, cfg.RazorpayKeySecret)

	customerSvc := customer.NewService(pool)
	productSvc := product.NewService(pool, notifier, log)
	orderSvc := order.NewService(pool, rdb, customerSvc, productSvc, notifier, shiprocket, log, cfg.PublicBaseURL)
	linkSvc := link.NewService(pool, productSvc, cfg.PublicBaseURL)
	planSvc := plan.NewService(pool, rdb, cfg, platformRzp, notifier, log)
	paySvc := payment.NewService(pool, rdb, orderSvc, cipher, cfg, log)
	authSvc := auth.NewService(pool, rdb, cfg, notifier, log)
	broadcastSvc := broadcast.NewService(pool, notifier, log)
	broadcastSvc.StartScheduler(ctx)
	aiClient := ai.NewClient(cfg)
	aiSvc := ai.NewService(pool, aiClient, orderSvc, productSvc, log)

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
		Uploads:    storage.NewHandler(store),
		Public:     publicapi.NewHandler(pool, linkSvc, orderSvc, otpSvc, paySvc, planSvc, productSvc, customerSvc),
		Admin:      admin.NewHandler(admin.NewService(pool, rdb, cfg)),
		PaySvc:     paySvc,
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  90 * time.Second,
	}

	go func() {
		log.Info("carthedge api listening", "port", cfg.Port, "env", cfg.Env, "storage", cfg.StorageDriver, "aiProvider", cfg.AIProvider)
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
