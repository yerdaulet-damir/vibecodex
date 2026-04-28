// Domain types for AI provider integrations — these are what crosses
// the ACL boundary (Principle B3 / F3).
package providers

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"
)

type JobRequest struct {
	ModelID        string
	Prompt         string
	Modality       string // "image" | "video" | "text"
	Params         map[string]any
	IdempotencyKey string
}

type JobResult struct {
	URL      string
	CostUSD  decimal.Decimal
	Provider string
	ModelID  string
	Metadata map[string]any
}

// AIProvider — small interface every adapter satisfies (Principle E3).
type AIProvider interface {
	Generate(ctx context.Context, req JobRequest) (JobResult, error)
}

// ProviderError — typed error so callers can decide retry vs fail.
type ProviderError struct {
	Provider  string
	Message   string
	Retryable bool
	HTTPCode  int
}

func (e *ProviderError) Error() string {
	return e.Provider + ": " + e.Message
}

// Sentinels for common cases — wrap with %w when returning.
var (
	ErrRateLimited     = errors.New("provider: rate limited")
	ErrTimeout         = errors.New("provider: timeout")
	ErrInvalidResponse = errors.New("provider: invalid response")
)
