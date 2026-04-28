// Server wiring + graceful shutdown — Principle F7.
package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/yerdaulet-damir/vibecodex/examples/go/internal/credits"
)

type Config struct {
	Logger        *slog.Logger
	Credits       *credits.Service
	ImageProvider imageProvider
}

type Server struct {
	cfg     Config
	handler http.Handler
}

func New(cfg Config) *Server {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /credits/charge", chargeHandler(cfg.Credits))
	mux.HandleFunc("POST /generate/image", generateImageHandler(cfg.ImageProvider))

	// Middleware tower (outer-most first):
	//   recover → request context → handlers
	handler := http.Handler(mux)
	handler = withRequestContext(cfg.Logger)(handler)
	handler = recoverPanics(cfg.Logger)(handler)

	return &Server{cfg: cfg, handler: handler}
}

// Run blocks until ctx is canceled or a SIGINT/SIGTERM is received,
// then drains in-flight requests for up to 30s before returning.
func (s *Server) Run(parent context.Context, addr string) error {
	srv := &http.Server{
		Addr:              addr,
		Handler:           s.handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(parent, syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		s.cfg.Logger.Info("listening", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		s.cfg.Logger.Info("shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
