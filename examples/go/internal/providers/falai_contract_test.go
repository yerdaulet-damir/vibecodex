// Contract test — Principle F10. If FalAI changes their response shape,
// this test breaks in CI before any user sees a 500.
package providers

import (
	"testing"
)

func TestParseResponse_ContractV1(t *testing.T) {
	t.Parallel()
	// Snapshot of a real falai image response (v1 shape).
	raw := []byte(`{
		"output": {"url": "https://cdn.example.com/img/abc.png"},
		"cost": "0.004",
		"id": "job_abc123"
	}`)
	res, err := parseResponse(raw, JobRequest{ModelID: "test-model"})
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	if res.URL == "" {
		t.Fatal("expected non-empty URL")
	}
	if res.CostUSD.IsZero() {
		t.Fatal("expected non-zero cost")
	}
	if res.Provider != providerName {
		t.Fatalf("got provider %q, want %q", res.Provider, providerName)
	}
}

func TestParseResponse_RejectsMissingURL(t *testing.T) {
	t.Parallel()
	raw := []byte(`{"output": {}, "cost": "0.004"}`)
	_, err := parseResponse(raw, JobRequest{})
	if err == nil {
		t.Fatal("expected error for missing url")
	}
}
