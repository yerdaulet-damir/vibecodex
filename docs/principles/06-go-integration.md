# Part F — Go Integration Patterns (10 principles)

Where Part E covers structure, Part F covers the wiring — how a Go service talks to databases, downstream HTTP APIs, and observability infrastructure. These are the patterns that separate a Go service that survives a year of vibe-coded changes from one that crumbles the first time a downstream provider hangs.

If your Go template still teaches global `*sql.DB` variables, `init()` for setup, or `panic()` on errors, it's teaching pre-`context.Context` Go. That ship sailed.

---

## F1 — Accept interfaces, return structs (Go's hexagonal idiom)

**Rule:** Every constructor in `internal/<domain>/` returns a **concrete struct**. Consumers (handlers, other services) accept the **smallest interface** they actually need.

This is the Go-flavored version of FastAPI Principle B1 and Next.js Principle D6. The mechanics are different (no `Protocol` keyword, no `interface UsersRepoProtocol` file) but the intent is identical: services depend on **behavior**, not on **implementations**.

```go
// internal/credits/service.go — implementation, returns concrete *Service
package credits

type Repository interface {
    Hold(ctx context.Context, userID string, amount decimal.Decimal, idem string) (string, error)
    Confirm(ctx context.Context, holdID string) error
    Refund(ctx context.Context, holdID string) error
}

type Service struct {
    repo Repository
    log  *slog.Logger
}

func NewService(repo Repository, log *slog.Logger) *Service {
    return &Service{repo: repo, log: log}
}
```

```go
// internal/server/handlers.go — consumer accepts a tiny interface
package server

type chargeService interface {
    Charge(ctx context.Context, userID string, amount decimal.Decimal, idem string) error
}

func chargeHandler(svc chargeService) http.HandlerFunc { ... }
```

The handler depends on **one method**. Tests fake one method. The credits service can grow ten more methods without breaking the handler's contract.

---

## F2 — `context.Context` is the first parameter of every I/O function

**Rule:** Any function that does **I/O** — DB query, HTTP call, file read, external service — takes `ctx context.Context` as its **first parameter**. No exceptions.

```go
// BAD
func (s *Service) Charge(userID string, amount decimal.Decimal) error { ... }

// GOOD
func (s *Service) Charge(ctx context.Context, userID string, amount decimal.Decimal, idem string) error {
    return s.repo.Hold(ctx, userID, amount, idem)
}
```

**What ctx carries:**
- **Cancellation:** when the HTTP request is aborted, the context is done — DB calls and HTTP calls observe it and stop.
- **Deadlines:** `ctx, cancel := context.WithTimeout(parent, 5*time.Second)` — propagates to every downstream call automatically.
- **Request-scoped values:** request ID, user ID, trace ID for logging. **Never** use `context` for "global" config or dependencies.

**Forbidden:**
- Storing `ctx` in struct fields
- `context.Background()` inside a request handler — pass the request's `r.Context()` instead
- `context.TODO()` in production code (it's a placeholder for refactors)

---

## F3 — Errors as values, wrapped with `%w`

**Rule:** Errors are returned, never `panic()`'d. Wrap with `%w` to preserve the error chain. Inspect with `errors.Is` and `errors.As`.

```go
// internal/credits/errors.go
package credits

import "errors"

var (
    ErrInsufficientFunds = errors.New("credits: insufficient funds")
    ErrHoldNotFound      = errors.New("credits: hold not found")
)

// Custom typed error for richer info (preferred for new code over sentinel-only)
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string { return e.Field + ": " + e.Message }
```

```go
// Wrap with %w to preserve the chain
func (s *Service) Charge(ctx context.Context, userID string, amount decimal.Decimal, idem string) error {
    if amount.LessThanOrEqual(decimal.Zero) {
        return &ValidationError{Field: "amount", Message: "must be positive"}
    }
    if _, err := s.repo.Hold(ctx, userID, amount, idem); err != nil {
        return fmt.Errorf("credits.Charge: %w", err)
    }
    return nil
}
```

```go
// Caller inspects with errors.Is / errors.As
err := svc.Charge(ctx, "u-1", amt, "idem-1")
switch {
case errors.Is(err, credits.ErrInsufficientFunds):
    http.Error(w, err.Error(), http.StatusPaymentRequired)
case errors.As(err, new(*credits.ValidationError)):
    http.Error(w, err.Error(), http.StatusUnprocessableEntity)
case err != nil:
    http.Error(w, "internal error", http.StatusInternalServerError)
}
```

`panic()` is reserved for **truly unrecoverable** programmer errors (nil dereference, impossible state). Production handlers wrap a `recover()` middleware to keep the server alive.

---

## F4 — Bulkhead: one `*http.Client` per downstream provider

**Rule:** Never use `http.DefaultClient` for downstream API calls. Each external dependency gets its own `*http.Client` with its own `Transport`, configured for that dependency's expected load and timeouts.

This mirrors FastAPI Principle B5. Different language, identical reasoning: a hung Fal.ai connection must not exhaust connections to OpenRouter.

```go
// internal/httpclient/client.go
package httpclient

func New(provider string) *http.Client {
    transport := &http.Transport{
        MaxIdleConns:        100,
        MaxConnsPerHost:     50,    // critical — default is 2!
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
        TLSHandshakeTimeout: 10 * time.Second,
    }
    return &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }
}
```

```go
// internal/providers/falai.go
package providers

type FalAI struct {
    client *http.Client
    log    *slog.Logger
}

func NewFalAI(log *slog.Logger) *FalAI {
    return &FalAI{client: httpclient.New("falai"), log: log}
}
```

A separate `*http.Client` per provider (one for FalAI, one for OpenRouter, one for Stripe) means a hung downstream caps its own connection pool — never the whole server's file descriptors.

---

## F5 — Idempotency keys via header + lookup table

**Rule:** Every side-effect operation forwards an `Idempotency-Key` header. The repository checks the table before inserting.

```go
// In the provider call
req.Header.Set("Idempotency-Key", request.IdempotencyKey)

// In the repository (SQL)
const insertHold = `
INSERT INTO credit_holds (id, user_id, amount, idempotency_key, status)
VALUES ($1, $2, $3, $4, 'held')
ON CONFLICT (idempotency_key) DO UPDATE SET id = credit_holds.id
RETURNING id`
```

`ON CONFLICT` with the unique `idempotency_key` index makes the operation safe under retries. Same as FastAPI B6.

---

## F6 — `log/slog` with structured attributes + request context

**Rule:** Use `log/slog` (Go 1.21+) for all logs. JSON output in production. Inject request-scoped attributes (request ID, user ID) via middleware so they appear on every log line for that request.

```go
// internal/context/keys.go
package appctx

type ctxKey int

const (
    keyRequestID ctxKey = iota
    keyUserID
)

func WithRequestID(ctx context.Context, id string) context.Context {
    return context.WithValue(ctx, keyRequestID, id)
}

func RequestID(ctx context.Context) string {
    v, _ := ctx.Value(keyRequestID).(string)
    return v
}
```

```go
// internal/server/middleware.go — middleware injects request ID and a child logger
func WithRequestLogger(base *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            id := uuid.NewString()
            ctx := appctx.WithRequestID(r.Context(), id)
            log := base.With("request_id", id, "path", r.URL.Path)
            ctx = context.WithValue(ctx, loggerKey{}, log)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// Then anywhere downstream:
slog.Info("charging user", "user_id", uid, "amount", amt)
// Output: {"level":"INFO","msg":"charging user","request_id":"...","path":"/charge","user_id":"u-1","amount":"4.00"}
```

**Forbidden:**
- `fmt.Println` / `log.Printf` for production logs
- Logging passwords, tokens, full card numbers
- Logging `err` without context (always include `user_id`, `request_id`, what was being attempted)

---

## F7 — Graceful shutdown is non-negotiable

**Rule:** The server listens for `SIGINT` and `SIGTERM`, stops accepting new connections, drains in-flight requests for up to 30 seconds, then exits cleanly. No exceptions.

```go
// internal/server/run.go
func (s *Server) Run(ctx context.Context, addr string) error {
    srv := &http.Server{Addr: addr, Handler: s.handler}

    errCh := make(chan error, 1)
    go func() {
        s.log.Info("listening", "addr", addr)
        if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
            errCh <- err
        }
    }()

    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    select {
    case err := <-errCh:
        return err
    case sig := <-sigCh:
        s.log.Info("shutdown signal received", "signal", sig.String())
    case <-ctx.Done():
        s.log.Info("context canceled, shutting down")
    }

    shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    return srv.Shutdown(shutdownCtx)
}
```

Without this, a Kubernetes rolling deploy drops in-flight requests, returning 502s to users.

---

## F8 — `errgroup` for concurrent operations with error propagation

**Rule:** When you need to fan out work concurrently and any single error should cancel the rest, use `golang.org/x/sync/errgroup`. Not raw goroutines + channels. Not `sync.WaitGroup` (no error propagation).

```go
import "golang.org/x/sync/errgroup"

func (s *Service) FanOut(ctx context.Context, ids []string) error {
    g, gctx := errgroup.WithContext(ctx)

    for _, id := range ids {
        id := id  // capture
        g.Go(func() error {
            return s.processOne(gctx, id)  // ctx cancels on first error
        })
    }
    return g.Wait()
}
```

If `processOne` returns an error for any ID, `gctx` is canceled — every other goroutine that observes `gctx` exits early. The `Wait()` call returns the first error.

`sync.WaitGroup` is for fire-and-forget background tasks where you don't care about errors (rare). Channels are for streaming pipelines. `errgroup` is for the 80% case of "do these N things in parallel, fail fast if any fails."

---

## F9 — Single-writer for critical resources

**Rule:** Mirroring FastAPI Principle B10 — for critical resources (wallet balance, inventory count, idempotency state), exactly **one function** is the writer.

In Go this is enforced two ways:

1. **By package boundary:** make the writer method only callable on the concrete type in one package. Other packages can read but the write method isn't on any interface they consume.
2. **By a `sync.Mutex`** if multi-goroutine writes are inevitable in the same process.

Most production Go services use **option 1** + database-level locking (`SELECT ... FOR UPDATE`) — pushing serialization to Postgres rather than Go memory.

```go
package credits

// Service.Charge is the SINGLE writer for user credit charges.
// Repository.Hold is private to this package — no other code can call it.

func (s *Service) Charge(ctx context.Context, userID string, amount decimal.Decimal, idem string) error {
    return s.repo.Hold(ctx, userID, amount, idem)  // only path
}
```

The architecture lint script greps that `repo.Hold(` only appears inside `internal/credits/service.go`.

---

## F10 — Contract tests with `httptest`

**Rule:** Every external provider has a contract test that loads a fixture (saved real response) and asserts the parser still works.

```go
// internal/providers/falai_contract_test.go
func TestFalAI_ParseImageResponse_ContractV1(t *testing.T) {
    body, err := os.ReadFile("testdata/falai_image_v1.json")
    if err != nil { t.Fatal(err) }

    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        w.Write(body)
    }))
    defer srv.Close()

    p := &FalAI{client: srv.Client(), baseURL: srv.URL, log: slog.Default()}
    res, err := p.GenerateImage(context.Background(), GenerateImageRequest{...})
    if err != nil { t.Fatalf("parse failed: %v", err) }
    if res.URL == "" { t.Fatal("expected URL in response") }
    if res.CostUSD.IsZero() { t.Fatal("expected non-zero cost") }
}
```

When FalAI changes their response shape, this test breaks in CI — not in production logs three days later. Same as FastAPI B9 and Next.js D1's spirit (contract surface as an explicit artifact).

---

## Integration checklist (run before commit)

```bash
# F1: services return concrete structs, not interfaces
grep -rn "func New[A-Z].*\binterface\b" internal/  # should be empty

# F2: context.Context is first parameter of I/O functions
grep -rn "func.*\(.*ctx context.Context" internal/ | wc -l  # should be high

# F3: no panic in production code
grep -rn "panic(" internal/ --include="*.go" | grep -v "_test.go\|recover"

# F4: no http.DefaultClient
grep -rn "http\.DefaultClient" internal/

# F6: no fmt.Println / log.Printf in production code
grep -rn "fmt\.Println\|log\.Printf" internal/ --include="*.go" | grep -v "_test.go"

# F9: repo.Hold called from one place only
grep -rln "\.Hold(" internal/ --include="*.go" | grep -v "_test.go"
# expected: only internal/credits/service.go (and the repo definition)
```

---

## Summary of all 18 Go principles

| Part | # | Principle |
|------|---|-----------|
| **E** | E1 | `cmd/`, `internal/`, `pkg/` — but stay flat |
| | E2 | Package per responsibility, no `utils` |
| | E3 | Small interfaces at the consumer side |
| | E4 | 500 LOC soft / 800 hard cap |
| | E5 | `_test.go` next to code, table-driven |
| | E6 | Generated code in its own file/folder |
| | E7 | Domain types stay in domain package |
| | E8 | Thin `main.go`, real logic in `run()` |
| **F** | F1 | Accept interfaces, return structs |
| | F2 | `context.Context` first, always |
| | F3 | Errors as values, `%w` wrap, `errors.Is/As` |
| | F4 | One `*http.Client` per provider |
| | F5 | Idempotency keys via header + DB |
| | F6 | `log/slog` structured + request context |
| | F7 | Graceful shutdown ritual |
| | F8 | `errgroup` for concurrent ops |
| | F9 | Single-writer for critical resources |
| | F10 | Contract tests with `httptest` |

Combined with Parts A+B (FastAPI) and C+D (Next.js):

> **vibecodex = 54 production principles** spanning a full AI-powered SaaS stack — Python backend, TypeScript frontend, Go microservices.
