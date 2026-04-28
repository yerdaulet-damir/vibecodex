# vibecodex / examples / go

Reference Go 1.22+ service demonstrating all 18 vibecodex Go principles ([Part E](../../docs/principles/05-go-decomposition.md) + [Part F](../../docs/principles/06-go-integration.md)).

This is deliberately small — its job is to show the patterns clearly, not to be a feature-complete starter.

## What's demonstrated

| Principle | File |
|-----------|------|
| E1 — `cmd/` + `internal/` flat layout | top-level dirs |
| E2 — Package per responsibility, no `utils` | every package has one job |
| E3 — Small interfaces at consumer side | `chargeService` in `server/handlers.go` |
| E4 — File size cap | every file < 200 LOC |
| E5 — Table-driven tests with `t.Run` | `credits/service_test.go` |
| E8 — Thin `main.go`, real logic in `run()` | `cmd/api/main.go` |
| F1 — Accept interfaces, return structs | service constructors |
| F2 — `context.Context` first parameter | every I/O method |
| F3 — Errors as values, `%w` wrap, typed errors | `credits/errors.go` |
| F4 — One `*http.Client` per provider | `internal/httpclient/client.go` |
| F5 — Idempotency keys via header + DB | `Idempotency-Key` header in `falai.go`; `idem` map in repo |
| F6 — `log/slog` + request context | `server/middleware.go` + `internal/context/keys.go` |
| F7 — Graceful shutdown | `server/run.go` — `signal.NotifyContext` + `srv.Shutdown` |
| F9 — Single-writer for credits | only `credits/service.go` calls `repo.Hold()` |
| F10 — Contract tests | `providers/falai_contract_test.go` |

## File map

```
examples/go/
├── go.mod
├── cmd/api/main.go                       # thin wiring (E8)
├── internal/
│   ├── credits/
│   │   ├── errors.go                     # ValidationError + sentinels (F3)
│   │   ├── repository.go                 # Repository interface + MemoryRepo
│   │   ├── service.go                    # Single-writer (F9)
│   │   └── service_test.go               # Table-driven (E5)
│   ├── providers/
│   │   ├── types.go                      # JobRequest, JobResult, ProviderError
│   │   ├── falai.go                      # ACL + bulkhead client (F3, F4)
│   │   ├── env.go
│   │   └── falai_contract_test.go        # Contract test (F10)
│   ├── httpclient/client.go              # Per-provider client factory (F4)
│   ├── context/keys.go                   # request_id / user_id / provider keys (F6)
│   └── server/
│       ├── handlers.go                   # Thin handlers, error mapping (F1, F3)
│       ├── middleware.go                 # request_id + panic recovery (F6)
│       └── run.go                        # Graceful shutdown (F7)
```

## The differentiators (what most Go starters miss)

1. **Bulkhead per downstream** — `httpclient.Get("falai")` returns a dedicated `*http.Client` with `MaxConnsPerHost=50`. A hung Fal.ai connection cannot exhaust connections to OpenRouter.

2. **Single-writer for money** — `repo.Hold()` is only ever called from `credits.Service.Charge()`. Lint-enforced. One audit point. One test point.

3. **Contract tests on responses** — `falai_contract_test.go` parses a saved real response. CI breaks the day Fal.ai changes their JSON, not the day a user gets a 500.

4. **Errors mapped to HTTP at the edge** — `handleServiceError` and `handleProviderError` bridge `errors.Is/As` to status codes. Handlers never write `if err.Error() == "..."`.

5. **`signal.NotifyContext` graceful shutdown** — the modern pattern (Go 1.16+), replacing the verbose `signal.Notify(chan)` ritual.

## Running

This is reference code, not a runnable starter. To make it a working server:

```bash
cd examples/go
go mod tidy
go test ./...                # contract tests + table-driven tests pass without network
go run ./cmd/api             # listens on :8080
```

Real production deployments would add: a Postgres-backed repo, OpenTelemetry tracing, a config loader (env or `viper`), and proper auth middleware.
