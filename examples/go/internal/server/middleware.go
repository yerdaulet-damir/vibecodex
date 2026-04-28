// Request-scoped logging + panic recovery — Principle F6.
package server

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/google/uuid"

	appctx "github.com/yerdaulet-damir/vibecodex/examples/go/internal/context"
)

func withRequestContext(base *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := r.Header.Get("X-Request-ID")
			if id == "" {
				id = uuid.NewString()
			}
			ctx := appctx.WithRequestID(r.Context(), id)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func recoverPanics(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					log.ErrorContext(r.Context(), "panic recovered",
						"err", rec,
						"request_id", appctx.RequestID(r.Context()),
						"stack", string(debug.Stack()),
					)
					http.Error(w, `{"error":"internal error"}`, http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
