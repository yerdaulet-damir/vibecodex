# Part E — Go Decomposition (8 principles)

The Go half of structural rules. Go's idioms differ from Python and TypeScript — short package names, flat layouts, "accept interfaces, return structs", no `utils` packages. These eight principles codify what a 2024-2025 production Go service looks like, distinct from the bloated layouts that copy Java patterns or treat `pkg/` as a dumping ground.

These rules apply equally to LLM agents (Cursor, Claude, Copilot) writing Go code as they do to humans. When in doubt, prefer the rule that produces a smaller, flatter, more direct change.

---

## E1 — `cmd/`, `internal/`, `pkg/` — but stay flat

**Rule:** Use `golang-standards/project-layout` as a *skeleton*, not as a religion.

```
cmd/api/main.go            # binary entry points (one folder per binary)
internal/                  # everything that isn't a public library
  ├── credits/             # one folder per business domain
  ├── providers/
  └── server/              # http wiring, middleware
pkg/                       # ONLY if you are publishing a library
go.mod
```

**Forbidden:**
- `pkg/` if your repo is a service (no external Go consumers) — put everything in `internal/`
- Nested `internal/foo/internal/bar/internal/...` — flatten
- `cmd/api/internal/...` — `internal/` lives at the repo root

`internal/` is enforced by the Go compiler (other modules can't import it) — it's the strongest hexagonal boundary the language gives you.

---

## E2 — Package per responsibility, no `utils` / `helpers` / `common`

**Rule:** Every Go package has **one job** and is named after that job. Forbidden package names: `utils`, `util`, `helpers`, `common`, `shared`, `lib`, `misc`.

```text
# BAD
internal/utils/
  format.go
  validate.go
  parse.go
  retry.go      # one folder, four unrelated jobs

# GOOD
internal/format/    # money, durations, names
internal/validate/  # input rules
internal/retry/     # exponential backoff helpers
```

**Why:** package names are part of the call site (`format.Money(...)`). A function named `utils.Format` tells the reader nothing. `format.Money` tells them everything.

If a function genuinely doesn't belong to any domain, it's probably an inline private helper, not a package.

---

## E3 — Small interfaces at the consumer side

**Rule:** Define interfaces where they are **used**, not where they are implemented. Keep them small (1–3 methods).

This is the Go proverb: *"Accept interfaces, return structs."* It is the Go equivalent of FastAPI's Principle B1 (hexagonal) and Next.js's `UsersRepoProtocol` — but the convention is **inverted** from typical OOP languages.

```go
// BAD — interface defined alongside the implementation, with everything on it
package credits

type CreditsService interface {
    Charge(ctx context.Context, userID string, amount decimal.Decimal) error
    Refund(ctx context.Context, holdID string) error
    GetBalance(ctx context.Context, userID string) (decimal.Decimal, error)
    GetHistory(ctx context.Context, userID string, limit int) ([]Transaction, error)
    // ... 12 more methods
}

type creditsService struct{ db *sql.DB }
func (s *creditsService) Charge(...) error { ... }
```

```go
// GOOD — consumer defines exactly the slice of behavior it needs
package server // or wherever the handler lives

type chargeService interface {
    Charge(ctx context.Context, userID string, amount decimal.Decimal) error
}

func chargeHandler(svc chargeService) http.HandlerFunc { ... }

// credits package returns a concrete *credits.Service struct.
// Handler accepts the small chargeService interface — easy to fake in tests.
```

**Result:** the credits package returns a concrete struct. Each consumer defines the minimal interface it needs. Tests are trivial — implement two methods, not twelve.

---

## E4 — File size: 500 LOC soft cap

**Rule:**
- **Soft cap:** 500 LOC per `.go` file
- **Hard cap:** 800 LOC

Go is verbose by design (explicit error returns, no inheritance). Files run longer than Python. Adjust caps accordingly — but the underlying principle from Parts A and C still applies: a file that does too many things splits into multiple files in the same package.

Splitting a Go file does **not** require a new package. Just a new file in the same package:

```text
internal/credits/
  service.go         # core type + methods
  service_charge.go  # Charge() + helpers
  service_refund.go  # Refund() + helpers
  service_test.go
```

All files in the same folder = same package = no import changes for callers.

---

## E5 — Test files alongside code, table-driven by default

**Rule:** Every `foo.go` has a `foo_test.go` next to it. Tests follow the **table-driven** idiom with `t.Run` subtests.

```go
// internal/credits/service_test.go
func TestService_Charge(t *testing.T) {
    cases := []struct {
        name    string
        balance decimal.Decimal
        amount  decimal.Decimal
        wantErr error
    }{
        {"happy path", dec("10.00"), dec("4.00"), nil},
        {"insufficient", dec("3.00"), dec("4.00"), ErrInsufficientFunds},
        {"zero amount", dec("10.00"), dec("0.00"), ErrInvalidAmount},
    }
    for _, tc := range cases {
        t.Run(tc.name, func(t *testing.T) {
            t.Parallel()
            repo := &fakeRepo{balance: tc.balance}
            svc := New(repo)
            err := svc.Charge(context.Background(), "u-1", tc.amount, "idem-1")
            if !errors.Is(err, tc.wantErr) {
                t.Fatalf("got %v, want %v", err, tc.wantErr)
            }
        })
    }
}
```

**Why:** subtests run independently — one failure doesn't skip the rest. `t.Parallel()` makes them concurrent. Adding a case = one struct literal, not a whole new function.

---

## E6 — Generated code lives in its own file or folder

**Rule:** Code from `sqlc`, `mockgen`, `protoc`, `wire`, etc. is **never** edited by hand. Make that obvious by either:

1. Putting it in a clearly-named folder: `internal/credits/db/` (sqlc output) or `internal/credits/mocks/`
2. Adding a `// Code generated by X. DO NOT EDIT.` header (sqlc and friends do this automatically)

Hand-written code lives next to it but never **mixed into the same file** as generated code.

```text
internal/credits/
  service.go           # hand-written
  service_test.go
  db/                  # generated by sqlc — do not edit
    queries.sql.go
    models.go
```

---

## E7 — Domain types stay in the domain package, not in a `types/` graveyard

**Rule:** A type that represents a **credits transaction** lives in `internal/credits/`, not in `internal/types/transaction.go`.

The Go community lost this fight against Java-style type packages a decade ago — you may still see `types/`, `models/`, or `entities/` in older codebases. Do not propagate them. Each domain owns its types; cross-domain references go through interfaces.

```go
// GOOD
package credits

type Transaction struct { ... }
type Hold struct { ... }
type Repository interface { ... }
```

If two packages need the same type, ask: which package is the *owner*? Put it there. Other packages import.

---

## E8 — One `cmd/<binary>` per executable, `main.go` stays thin

**Rule:** `cmd/api/main.go` is a wiring file. Real logic lives in `internal/`. A `main` function over ~80 lines is a smell.

```go
// cmd/api/main.go — thin wiring, no business logic
package main

func main() {
    if err := run(context.Background(), os.Stdout, os.Args); err != nil {
        fmt.Fprintf(os.Stderr, "%s\n", err)
        os.Exit(1)
    }
}

func run(ctx context.Context, w io.Writer, args []string) error {
    cfg, err := config.Load()
    if err != nil {
        return fmt.Errorf("load config: %w", err)
    }

    logger := slog.New(slog.NewJSONHandler(w, nil))
    db, err := sql.Open("postgres", cfg.DatabaseURL)
    if err != nil {
        return fmt.Errorf("open db: %w", err)
    }
    defer db.Close()

    creditsRepo := credits.NewSQLRepo(db)
    creditsSvc := credits.NewService(creditsRepo)

    srv := server.New(server.Config{
        Logger:  logger,
        Credits: creditsSvc,
    })

    return srv.Run(ctx, cfg.Addr)
}
```

**Why this shape (Mat Ryer, 2024):**
- `run()` is testable — pass a buffer for `w`, fake `args`
- `main()` is uncoverable boilerplate; keep it tiny
- Constructor injection (`server.New(...)`) makes the dependency graph explicit
- `defer db.Close()` belongs in `run()`, not in init functions

---

## Decomposition checklist (run before commit)

```bash
# File size
find . -name "*.go" -not -path "./vendor/*" | xargs wc -l | sort -rn | head

# Forbidden package names
find . -type d \( -name utils -o -name util -o -name helpers \
  -o -name common -o -name shared -o -name misc \) -not -path "./vendor/*"

# pkg/ should be empty for service repos (no external library exports)
ls pkg/ 2>/dev/null

# All test files have _test.go suffix
find . -name "*test*.go" -not -name "*_test.go" -not -path "./vendor/*"

# main() is thin
wc -l cmd/*/main.go
```

---

**Next:** [Part F — Go integration patterns 2024-25](06-go-integration.md) — context.Context everywhere, errgroup, isolated http.Client per provider, slog, errors.As, graceful shutdown.
