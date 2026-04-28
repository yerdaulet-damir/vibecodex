// FalAI provider adapter — demonstrates ACL (F3), bulkhead (F4),
// idempotency (F5), and contextual logging (F6).
package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"

	"github.com/shopspring/decimal"

	appctx "github.com/yerdaulet-damir/vibecodex/examples/go/internal/context"
	"github.com/yerdaulet-damir/vibecodex/examples/go/internal/httpclient"
)

const providerName = "falai"

type FalAI struct {
	client  *http.Client
	baseURL string
	apiKey  string
	log     *slog.Logger
}

func NewFalAI(log *slog.Logger) *FalAI {
	return &FalAI{
		client:  httpclient.Get(providerName), // bulkhead — F4
		baseURL: getenv("FALAI_BASE_URL", "https://api.fal.ai"),
		apiKey:  getenv("FALAI_API_KEY", ""),
		log:     log,
	}
}

// Generate satisfies AIProvider. Always returns a JobResult or a typed error
// — never a raw map[string]any (ACL — Principle B3).
func (p *FalAI) Generate(ctx context.Context, req JobRequest) (JobResult, error) {
	ctx = appctx.WithProvider(ctx, providerName)

	body, _ := json.Marshal(map[string]any{
		"model":  req.ModelID,
		"prompt": req.Prompt,
		"params": req.Params,
	})

	endpoint, _ := url.JoinPath(p.baseURL, "/v1/generate")
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return JobResult{}, fmt.Errorf("falai: build request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Idempotency-Key", req.IdempotencyKey) // F5

	resp, err := p.client.Do(httpReq)
	if err != nil {
		// Distinguish timeout from other transport errors.
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return JobResult{}, fmt.Errorf("%w: %v", ErrTimeout, err)
		}
		return JobResult{}, &ProviderError{
			Provider:  providerName,
			Message:   err.Error(),
			Retryable: true,
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return JobResult{}, fmt.Errorf("%w: status 429", ErrRateLimited)
	}
	if resp.StatusCode >= 500 {
		return JobResult{}, &ProviderError{
			Provider:  providerName,
			Message:   fmt.Sprintf("status %d", resp.StatusCode),
			Retryable: true,
			HTTPCode:  resp.StatusCode,
		}
	}
	if resp.StatusCode >= 400 {
		return JobResult{}, &ProviderError{
			Provider:  providerName,
			Message:   fmt.Sprintf("status %d", resp.StatusCode),
			Retryable: false,
			HTTPCode:  resp.StatusCode,
		}
	}

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return JobResult{}, fmt.Errorf("falai: read body: %w", err)
	}
	return parseResponse(raw, req)
}

// parseResponse — the ACL boundary. Provider-specific shape goes IN,
// our domain JobResult comes OUT. If the shape changes, this is the only
// file that needs updating (and the contract test in falai_test.go fails first).
func parseResponse(raw []byte, req JobRequest) (JobResult, error) {
	var shape struct {
		Output struct {
			URL string `json:"url"`
		} `json:"output"`
		Cost string `json:"cost"`
	}
	if err := json.Unmarshal(raw, &shape); err != nil {
		return JobResult{}, fmt.Errorf("%w: unmarshal: %v", ErrInvalidResponse, err)
	}
	if shape.Output.URL == "" {
		return JobResult{}, fmt.Errorf("%w: missing output.url", ErrInvalidResponse)
	}
	cost, err := decimal.NewFromString(shape.Cost)
	if err != nil {
		cost = decimal.Zero
	}
	return JobResult{
		URL:      shape.Output.URL,
		CostUSD:  cost,
		Provider: providerName,
		ModelID:  req.ModelID,
	}, nil
}

func getenv(key, def string) string {
	v := osLookupEnv(key)
	if v == "" {
		return def
	}
	return v
}
