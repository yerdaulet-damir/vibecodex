// Repository interface lives next to the consumer (the Service) — Principle E3.
// The concrete *MemoryRepo lives in userstore subpackage / memory.go below.
package credits

import (
	"context"
	"sync"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// Repository — the smallest interface the Service needs. No God interface.
type Repository interface {
	Hold(ctx context.Context, userID string, amount decimal.Decimal, idempotencyKey string) (holdID string, err error)
	Confirm(ctx context.Context, holdID string) error
	Refund(ctx context.Context, holdID string) error
	Balance(ctx context.Context, userID string) (decimal.Decimal, error)
	Credit(ctx context.Context, userID string, amount decimal.Decimal, reason string) error
}

// MemoryRepo — process-local implementation for tests and local dev.
// In production, swap for a *PostgresRepo with the same interface (Principle B8 feature flags).
type MemoryRepo struct {
	mu       sync.Mutex
	balances map[string]decimal.Decimal
	holds    map[string]*hold
	idem     map[string]string // idempotency_key -> holdID
}

type hold struct {
	userID string
	amount decimal.Decimal
	status string // "held" | "confirmed" | "refunded"
}

func NewMemoryRepo() *MemoryRepo {
	return &MemoryRepo{
		balances: make(map[string]decimal.Decimal),
		holds:    make(map[string]*hold),
		idem:     make(map[string]string),
	}
}

func (r *MemoryRepo) SeedBalance(userID string, amount decimal.Decimal) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.balances[userID] = amount
}

func (r *MemoryRepo) Hold(ctx context.Context, userID string, amount decimal.Decimal, idem string) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	r.mu.Lock()
	defer r.mu.Unlock()

	// Idempotency check — Principle B6/F5.
	if existing, ok := r.idem[idem]; ok {
		return existing, nil
	}

	balance := r.balances[userID]
	if balance.LessThan(amount) {
		return "", ErrInsufficientFunds
	}
	r.balances[userID] = balance.Sub(amount)

	holdID := uuid.NewString()
	r.holds[holdID] = &hold{userID: userID, amount: amount, status: "held"}
	r.idem[idem] = holdID
	return holdID, nil
}

func (r *MemoryRepo) Confirm(ctx context.Context, holdID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	h, ok := r.holds[holdID]
	if !ok {
		return ErrHoldNotFound
	}
	h.status = "confirmed"
	return nil
}

func (r *MemoryRepo) Refund(ctx context.Context, holdID string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	h, ok := r.holds[holdID]
	if !ok {
		return ErrHoldNotFound
	}
	if h.status != "held" {
		return nil // already resolved — idempotent
	}
	r.balances[h.userID] = r.balances[h.userID].Add(h.amount)
	h.status = "refunded"
	return nil
}

func (r *MemoryRepo) Balance(ctx context.Context, userID string) (decimal.Decimal, error) {
	if err := ctx.Err(); err != nil {
		return decimal.Zero, err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.balances[userID], nil
}

func (r *MemoryRepo) Credit(ctx context.Context, userID string, amount decimal.Decimal, _ string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.balances[userID] = r.balances[userID].Add(amount)
	return nil
}
