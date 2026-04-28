---
name: new-feature-go
description: Pre-flight checklist for adding a new feature to a Go 1.22+ service. Load when creating a new endpoint, internal package, external integration, or background worker. Forces "accept interfaces, return structs", `context.Context` propagation, error wrapping, and bulkhead-per-provider from line one — prevents the most common AI failures (God interfaces, raw goroutines without errgroup, http.DefaultClient everywhere, panic on errors).
---

# new-feature-go

Do not open any file for editing until all 6 steps are completed.

---

## Step 1 — Define the surface

Write the surface in plain text first:

```
Feature name: credits
Public types: *Service (concrete), Repository (interface, lives next to Service)
Methods: Charge(ctx, userID, amount, idem) (string, error)
         Confirm(ctx, holdID) error
         Refund(ctx, holdID) error
Errors: ErrInsufficientFunds (sentinel), *ValidationError (typed)
Single-writer for: Repository.Hold — only Service.Charge calls it
```

If the public surface needs more than 5-6 methods, the package is doing too much — split it (Principle E2).

---

## Step 2 — Pick the package location (Principle E1, E2)

| Scope | Location |
|-------|----------|
| Public library others import via go.mod | `pkg/<name>/` |
| Private to this service | `internal/<name>/` (default) |
| HTTP wiring / handlers | `internal/server/` |
| Cross-cutting helpers (genuine ones) | `internal/<purpose>/` (e.g. `internal/httpclient`) |
| Binary entry point | `cmd/<binary>/main.go` |

**Forbidden package names:** `utils`, `helpers`, `common`, `shared`, `lib`, `misc`. Pick a name that says what the package **does**.

---

## Step 3 — Build bottom-up

```
1. Errors          → internal/<name>/errors.go (sentinels + typed)
2. Repository iface → internal/<name>/repository.go (smallest set of methods)
3. Repository impl → internal/<name>/repository.go (MemoryRepo for tests, SQLRepo for prod)
4. Service struct  → internal/<name>/service.go (concrete, accepts Repository)
5. Service tests   → internal/<name>/service_test.go (table-driven, t.Run)
6. Handler         → internal/server/handlers.go (defines tiny consumer interface)
7. Wiring          → cmd/api/main.go (constructor injection)
```

**Critical rules during build:**
- Repository interface lives **next to the Service** that uses it — this is Go's hexagonal idiom (Principle E3).
- Service constructors return `*Service` (concrete). Handlers accept the smallest interface they need (Principle F1).
- `context.Context` is the **first parameter** of every I/O method (Principle F2).
- Errors are returned, never `panic`'d. Wrap with `%w` (Principle F3).
- If integrating an external HTTP API, get its client from `httpclient.Get("<provider>")` — never use `http.DefaultClient` (Principle F4).

---

## Step 4 — Wire context-aware logging

Every I/O method should log with context:

```go
s.log.InfoContext(ctx, "credits.charge",
    "user_id", userID,
    "amount", amount.String(),
    "hold_id", holdID,
)
```

`InfoContext`/`ErrorContext` (Go 1.21+) attach the request ID and other context-scoped values automatically if your slog handler is wired to read them. Don't use `fmt.Println`. Don't use `log.Printf`. (Principle F6.)

---

## Step 5 — Tests are table-driven with subtests

```go
func TestService_Charge(t *testing.T) {
    cases := []struct {
        name    string
        balance decimal.Decimal
        amount  decimal.Decimal
        wantErr error
    }{
        {"happy path", dec("10.00"), dec("4.00"), nil},
        {"insufficient", dec("3.00"), dec("4.00"), ErrInsufficientFunds},
    }
    for _, tc := range cases {
        tc := tc  // capture
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()
            svc := newTestService(t, tc.balance)
            _, err := svc.Charge(context.Background(), "u-1", tc.amount, "idem-"+tc.name)
            if !errors.Is(err, tc.wantErr) {
                t.Fatalf("got %v, want %v", err, tc.wantErr)
            }
        })
    }
}
```

For typed errors, use `errors.As`:

```go
var ve *ValidationError
if !errors.As(err, &ve) { t.Fatalf("expected ValidationError, got %v", err) }
```

---

## Step 6 — Verify principles before committing

```bash
# E2: no forbidden package names
find . -type d \( -name utils -o -name helpers -o -name common -o -name shared \) -not -path "./vendor/*"

# E4: file size cap
find . -name "*.go" -not -path "./vendor/*" | xargs wc -l | sort -rn | head

# F1: services return concrete structs
grep -rn "func New[A-Z].*\binterface\b" internal/  # should be empty

# F2: context.Context is first param of I/O methods
grep -rn "func.*\b(Charge|Hold|Refund|Get|List|Create|Update|Delete)\b\(" internal/ | grep -v "ctx context\.Context"

# F3: no panic in production code
grep -rn "panic(" internal/ --include="*.go" | grep -v "_test.go\|recover"

# F4: no http.DefaultClient
grep -rn "http\.DefaultClient" internal/

# F6: no fmt.Println in production code
grep -rn "fmt\.Println\|log\.Printf" internal/ --include="*.go" | grep -v "_test.go"

# F9: single-writer (e.g. repo.Hold called from one place)
grep -rln "\.Hold(" internal/ --include="*.go" | grep -v "_test.go\|repository.go"
# expected: only internal/credits/service.go
```

```bash
go vet ./...
go test ./... -race
```

Both must exit 0.

---

## Verification

- [ ] Surface defined in writing before any code
- [ ] Package name says what it does (no `utils`, `helpers`)
- [ ] Repository interface lives next to the consumer (Service), not next to the impl
- [ ] Service constructor returns concrete `*Service`
- [ ] `context.Context` is the first parameter of every I/O method
- [ ] All errors wrapped with `%w`; sentinels for stable conditions, typed errors for rich info
- [ ] `httpclient.Get(provider)` used for any external HTTP — never `http.DefaultClient`
- [ ] Logging via `slog` with context, no `fmt.Println`
- [ ] Tests are table-driven with `t.Run`
- [ ] All grep checks pass
- [ ] `go vet ./... && go test ./... -race` exits 0
