// Thin HTTP handlers — Principle F1: handlers depend on small interfaces,
// not the concrete *credits.Service. This is the "accept interfaces" half.
package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/yerdaulet-damir/vibecodex/examples/go/internal/credits"
	"github.com/yerdaulet-damir/vibecodex/examples/go/internal/providers"
)

// chargeService — the smallest slice this handler needs.
type chargeService interface {
	Charge(ctx context.Context, userID string, amount decimal.Decimal, idempotencyKey string) (string, error)
}

type chargeRequest struct {
	UserID         string `json:"user_id"`
	AmountUSD      string `json:"amount_usd"`
	IdempotencyKey string `json:"idempotency_key,omitempty"`
}

type chargeResponse struct {
	HoldID string `json:"hold_id"`
}

func chargeHandler(svc chargeService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req chargeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		amount, err := decimal.NewFromString(req.AmountUSD)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "amount_usd: not a number")
			return
		}
		if req.IdempotencyKey == "" {
			req.IdempotencyKey = uuid.NewString()
		}
		holdID, err := svc.Charge(r.Context(), req.UserID, amount, req.IdempotencyKey)
		if err != nil {
			handleServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, chargeResponse{HoldID: holdID})
	}
}

// imageProvider — minimal slice the handler needs.
type imageProvider interface {
	Generate(ctx context.Context, req providers.JobRequest) (providers.JobResult, error)
}

type generateImageRequest struct {
	UserID  string `json:"user_id"`
	Prompt  string `json:"prompt"`
	ModelID string `json:"model_id"`
}

func generateImageHandler(prov imageProvider) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req generateImageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if req.Prompt == "" {
			writeError(w, http.StatusUnprocessableEntity, "prompt: required")
			return
		}
		result, err := prov.Generate(r.Context(), providers.JobRequest{
			ModelID:        req.ModelID,
			Prompt:         req.Prompt,
			Modality:       "image",
			IdempotencyKey: uuid.NewString(),
		})
		if err != nil {
			handleProviderError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	}
}

// handleServiceError bridges credits errors to HTTP codes — F3 in action.
func handleServiceError(w http.ResponseWriter, err error) {
	var ve *credits.ValidationError
	switch {
	case errors.Is(err, credits.ErrInsufficientFunds):
		writeError(w, http.StatusPaymentRequired, err.Error())
	case errors.As(err, &ve):
		writeError(w, http.StatusUnprocessableEntity, ve.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}

func handleProviderError(w http.ResponseWriter, err error) {
	var pe *providers.ProviderError
	switch {
	case errors.Is(err, providers.ErrRateLimited):
		writeError(w, http.StatusTooManyRequests, err.Error())
	case errors.Is(err, providers.ErrTimeout):
		writeError(w, http.StatusGatewayTimeout, err.Error())
	case errors.Is(err, providers.ErrInvalidResponse):
		writeError(w, http.StatusBadGateway, err.Error())
	case errors.As(err, &pe):
		writeError(w, http.StatusBadGateway, pe.Error())
	default:
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}
