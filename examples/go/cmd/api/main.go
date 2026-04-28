// Principle E8: thin main, real logic in run().
package main

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"

	"github.com/yerdaulet-damir/vibecodex/examples/go/internal/credits"
	"github.com/yerdaulet-damir/vibecodex/examples/go/internal/providers"
	"github.com/yerdaulet-damir/vibecodex/examples/go/internal/server"
)

func main() {
	if err := run(context.Background(), os.Stdout, os.Args); err != nil {
		fmt.Fprintf(os.Stderr, "%s\n", err)
		os.Exit(1)
	}
}

// run is testable: pass a buffer for w, controlled args.
func run(ctx context.Context, w io.Writer, _ []string) error {
	logger := slog.New(slog.NewJSONHandler(w, &slog.HandlerOptions{Level: slog.LevelInfo}))

	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = ":8080"
	}

	// Constructor injection — dependency graph is explicit (Principle F1).
	creditsRepo := credits.NewMemoryRepo()
	creditsSvc := credits.NewService(creditsRepo, logger)

	imageProvider := providers.NewFalAI(logger)

	srv := server.New(server.Config{
		Logger:        logger,
		Credits:       creditsSvc,
		ImageProvider: imageProvider,
	})

	// Graceful shutdown ritual lives in srv.Run (Principle F7).
	if err := srv.Run(ctx, addr); err != nil && err != http.ErrServerClosed {
		return fmt.Errorf("server: %w", err)
	}
	return nil
}
