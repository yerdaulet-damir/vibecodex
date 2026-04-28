// Service — single-writer for user credit charges (Principle F9).
// repo.Hold is only called from inside this file. The architecture lint enforces this.
package credits

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/shopspring/decimal"
)

type Service struct {
	repo Repository
	log  *slog.Logger
}

func NewService(repo Repository, log *slog.Logger) *Service {
	return &Service{repo: repo, log: log}
}

// Charge holds credits and returns a holdID. Caller must Confirm or Refund.
// This is the ONLY function that calls repo.Hold for user-initiated charges.
func (s *Service) Charge(ctx context.Context, userID string, amount decimal.Decimal, idempotencyKey string) (holdID string, err error) {
	if amount.LessThanOrEqual(decimal.Zero) {
		return "", &ValidationError{Field: "amount", Message: "must be positive"}
	}
	holdID, err = s.repo.Hold(ctx, userID, amount, idempotencyKey)
	if err != nil {
		return "", fmt.Errorf("credits.Charge: %w", err)
	}
	s.log.InfoContext(ctx, "credits.hold",
		"user_id", userID,
		"amount", amount.String(),
		"hold_id", holdID,
	)
	return holdID, nil
}

func (s *Service) Confirm(ctx context.Context, holdID string) error {
	if err := s.repo.Confirm(ctx, holdID); err != nil {
		return fmt.Errorf("credits.Confirm: %w", err)
	}
	return nil
}

func (s *Service) Refund(ctx context.Context, holdID string) error {
	if err := s.repo.Refund(ctx, holdID); err != nil {
		return fmt.Errorf("credits.Refund: %w", err)
	}
	return nil
}

func (s *Service) Balance(ctx context.Context, userID string) (decimal.Decimal, error) {
	return s.repo.Balance(ctx, userID)
}
