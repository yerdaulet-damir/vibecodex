// Table-driven tests with t.Run subtests — Principle E5.
package credits

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/shopspring/decimal"
)

func dec(s string) decimal.Decimal {
	d, _ := decimal.NewFromString(s)
	return d
}

func newTestService(t *testing.T, balance decimal.Decimal) *Service {
	t.Helper()
	repo := NewMemoryRepo()
	repo.SeedBalance("u-1", balance)
	return NewService(repo, slog.New(slog.NewJSONHandler(io.Discard, nil)))
}

func TestService_Charge(t *testing.T) {
	cases := []struct {
		name    string
		balance decimal.Decimal
		amount  decimal.Decimal
		wantErr error
	}{
		{"happy path", dec("10.00"), dec("4.00"), nil},
		{"insufficient", dec("3.00"), dec("4.00"), ErrInsufficientFunds},
		{"zero amount", dec("10.00"), dec("0.00"), nil}, // expect ValidationError, checked via errors.As below
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			svc := newTestService(t, tc.balance)
			_, err := svc.Charge(context.Background(), "u-1", tc.amount, "idem-"+tc.name)

			if tc.name == "zero amount" {
				var ve *ValidationError
				if !errors.As(err, &ve) {
					t.Fatalf("expected ValidationError, got %v", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("got %v, want %v", err, tc.wantErr)
			}
		})
	}
}

func TestService_Charge_IsIdempotent(t *testing.T) {
	t.Parallel()
	svc := newTestService(t, dec("10.00"))
	ctx := context.Background()

	id1, err := svc.Charge(ctx, "u-1", dec("4.00"), "idem-x")
	if err != nil {
		t.Fatal(err)
	}
	id2, err := svc.Charge(ctx, "u-1", dec("4.00"), "idem-x")
	if err != nil {
		t.Fatal(err)
	}
	if id1 != id2 {
		t.Fatalf("expected same hold_id for identical idempotency_key, got %s vs %s", id1, id2)
	}

	// Balance should have been deducted exactly once.
	bal, _ := svc.Balance(ctx, "u-1")
	if !bal.Equal(dec("6.00")) {
		t.Fatalf("balance double-deducted: got %s, want 6.00", bal.String())
	}
}
