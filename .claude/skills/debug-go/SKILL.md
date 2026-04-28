---
name: debug-go
description: Systematic 5-step debugging flow for Go 1.22+ services. Load when a test fails, a goroutine leaks, a downstream provider hangs, errors lose context, or production logs are unhelpful. Forces layer isolation (handler vs service vs repo vs provider) and runs the 5 most common Go antipattern greps before any code change — prevents the "add a goroutine to fix a slow handler" cascade.
---

# debug-go

Stop. Do not edit any file yet. Work through these 5 steps in order.

---

## Step 1 — Locate the layer

Go bugs almost always live in one of these layers. Identify which one before touching code.

| Symptom | Likely layer | First grep |
|---------|------------|-----------|
| 500 in prod, no useful log | Handler — error mapping | `grep -n "errors.Is\|errors.As" internal/server/handlers.go` |
| Wrong amount / state after mutation | Service / repo | `grep -n "Hold\|Confirm\|Refund" internal/<domain>/service.go` |
| Hangs under load | HTTP client / bulkhead | `grep -rn "http.DefaultClient\|MaxConnsPerHost" internal/` |
| `context deadline exceeded` everywhere | Missing `ctx` propagation | `grep -rn "context.Background()\|context.TODO()" internal/` |
| Goroutine leak in pprof | `errgroup` not used / unclosed channels | `grep -rn "go func\b" internal/` |
| Test passes locally, race on CI | Shared mutable state | `go test ./... -race` |
| Panic crashes server | Missing `recover` middleware | `grep -rn "recover()" internal/server/` |
| Downstream API change broke us | Provider parser | `grep -rn "json.Unmarshal\|json.NewDecoder" internal/providers/` |

Pick **one** layer. Do not touch any other layer in this debug pass.

---

## Step 2 — Run the 5 most common Go antipattern greps

```bash
# Antipattern 1: http.DefaultClient (no per-provider isolation)
grep -rn "http\.DefaultClient" internal/

# Antipattern 2: context.Background() / context.TODO() in non-main code
grep -rn "context\.Background()\|context\.TODO()" internal/ \
  --include="*.go" | grep -v "_test.go"

# Antipattern 3: panic in production code
grep -rn "panic(" internal/ --include="*.go" | grep -v "_test.go\|recover"

# Antipattern 4: fmt.Println / log.Printf instead of slog
grep -rn "fmt\.Println\|log\.Printf" internal/ --include="*.go" | grep -v "_test.go"

# Antipattern 5: errors not wrapped with %w
grep -rn "errors\.New(\"[^%]*: \"" internal/ --include="*.go"
# Hits with concatenation suggest a missed `%w` opportunity.
```

| Result | Root cause | Principle |
|--------|-----------|-----------|
| `http.DefaultClient` used | Bulkhead broken — one slow downstream blocks all | F4 |
| `context.Background()` in handler chain | Lost cancellation/deadline propagation | F2 |
| `panic()` in handler/service | Server crashes on edge case | F3 |
| `fmt.Println`/`log.Printf` | Logs without context, unsearchable | F6 |
| `errors.New` with concatenated context | Lost error chain, `errors.Is/As` fails | F3 |

---

## Step 3 — Reproduce with `go test -run` and `-race`

For service/repo bugs — write a failing test first:

```go
func TestService_RaceOnConcurrentCharge(t *testing.T) {
    t.Parallel()
    svc := newTestService(t, dec("10.00"))
    ctx := context.Background()

    // Two concurrent charges with the same idempotency key.
    // Should hold once, not twice.
    var wg sync.WaitGroup
    var ids [2]string
    for i := 0; i < 2; i++ {
        i := i
        wg.Add(1)
        go func() {
            defer wg.Done()
            id, _ := svc.Charge(ctx, "u-1", dec("4.00"), "idem-x")
            ids[i] = id
        }()
    }
    wg.Wait()
    if ids[0] != ids[1] {
        t.Fatalf("idempotency violated: %s vs %s", ids[0], ids[1])
    }
}
```

Run it:

```bash
go test -run TestService_RaceOnConcurrentCharge -race -v ./internal/credits/
```

It must FAIL before the fix.

For HTTP client / provider bugs — use `httptest.Server` to simulate the failure:

```go
srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusTooManyRequests)
}))
defer srv.Close()

p := &FalAI{client: srv.Client(), baseURL: srv.URL, log: slog.Default()}
_, err := p.Generate(context.Background(), JobRequest{ModelID: "m", Prompt: "p"})
if !errors.Is(err, ErrRateLimited) {
    t.Fatalf("expected ErrRateLimited, got %v", err)
}
```

---

## Step 4 — Fix in the correct layer

Minimum change. Do not refactor unrelated code.

| Layer | Where to fix |
|-------|------------|
| Handler / error → HTTP code | `internal/server/handlers.go` |
| Business logic | `internal/<domain>/service.go` |
| Persistence / concurrency | `internal/<domain>/repository.go` |
| External API parsing | `internal/providers/<name>.go` (the ACL) |
| HTTP client config | `internal/httpclient/client.go` |
| Logging context | `internal/context/keys.go` + middleware |
| Graceful shutdown | `internal/server/run.go` |

**Goroutine leaks specifically:** add `errgroup` with a parent `context.WithCancel`. Every `go func` should be replaceable by `g.Go(func() error { ... })`. (Principle F8.)

---

## Step 5 — Verify

```bash
# Type / vet check
go vet ./...

# Race detector — catches concurrency bugs you can't see by reading
go test ./... -race

# All tests pass
go test ./...

# (If you have a linter)
golangci-lint run
```

Then re-run all 5 antipattern greps from Step 2. You must not have introduced any new violations while fixing.

---

## Common error → root cause table

| Error / Symptom | Where to look | Likely cause |
|----------------|--------------|--------------|
| `runtime error: invalid memory address` | nil pointer | A struct field not initialized — check the constructor |
| `concurrent map read and write` | shared mutable map | Add `sync.Mutex` or use `sync.Map` if read-heavy |
| `context deadline exceeded` cascading everywhere | parent ctx | Probably a fixed `context.WithTimeout(ctx, 1s)` upstream |
| `dial tcp: i/o timeout` | network or DNS | Check provider client `Timeout`; check pod DNS |
| `too many open files` | FD exhaustion | Bulkhead violation (F4): a hung downstream eating the pool |
| Test hangs forever | Unbuffered channel | Producer goroutine exited without sending; receiver waits forever |
| `interface conversion: ... is not ...` | wrong concrete type | Handler accepts a too-wide interface; tighten with the smallest method set |
| Panic mid-request, server stays up but log is silent | `recover` swallows | Make sure the recover middleware logs `rec` and `debug.Stack()` |
| Server doesn't drain on SIGTERM | `signal.Notify` not wired | Use `signal.NotifyContext` (Go 1.16+) — Principle F7 |
| Provider response field appears `null` after parse | Unmarshal hit zero value | Check JSON tag spelling; use `*string` if true-null matters |

---

## Verification

The skill was applied correctly when:
- [ ] A reproducible test exists (Step 3) — failing before, passing after
- [ ] Fix touches exactly one layer
- [ ] All 5 antipattern greps still come up clean
- [ ] `go vet ./... && go test ./... -race` exits 0
- [ ] No new file exceeds 500 LOC; no new package named `utils`/`helpers`/`common`
