// Typed errors and sentinel errors — Principle F3.
package credits

import "errors"

// Sentinel errors for stable conditions checked across the codebase.
var (
	ErrInsufficientFunds = errors.New("credits: insufficient funds")
	ErrHoldNotFound      = errors.New("credits: hold not found")
	ErrInvalidAmount     = errors.New("credits: amount must be positive")
)

// ValidationError carries field-level information; preferred for new code.
// Inspect with errors.As.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}
