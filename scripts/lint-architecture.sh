#!/usr/bin/env bash
# lint-architecture.sh — enforce architectural rules via grep.
#
# Exits 0 if all rules pass (warnings allowed).
# Exits 1 if ANY error-level rule is violated.
#
# Run locally: ./scripts/lint-architecture.sh
# CI: invoked from .github/workflows/ci.yml (see Makefile target `arch-lint`).

set -uo pipefail

# ---- colors --------------------------------------------------------------
if [[ -t 1 ]]; then
    RED=$'\033[0;31m'
    GREEN=$'\033[0;32m'
    YELLOW=$'\033[0;33m'
    BOLD=$'\033[1m'
    RESET=$'\033[0m'
else
    RED=""; GREEN=""; YELLOW=""; BOLD=""; RESET=""
fi

PASS=0
WARN=0
FAIL=0

ok()    { echo "${GREEN}✓${RESET} $1"; PASS=$((PASS+1)); }
warn()  { echo "${YELLOW}⚠${RESET} $1"; WARN=$((WARN+1)); }
fail()  { echo "${RED}✗${RESET} $1"; FAIL=$((FAIL+1)); }
header(){ echo "${BOLD}$1${RESET}"; }

# ---- locate root ---------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT/reference/app"

if [[ ! -d "$APP_DIR" ]]; then
    fail "reference/app/ not found at $APP_DIR"
    exit 1
fi

cd "$ROOT"

header ""
header "==> Architecture lint for $APP_DIR"
header ""

# ---- 1. No SQLAlchemy in services ---------------------------------------
header "[1/6] No SQLAlchemy imports in services/"
SQLA_HITS=$(grep -rn -E "from sqlalchemy|import sqlalchemy|AsyncSession|(^|[^a-zA-Z_])Session([^a-zA-Z_]|$)" \
    "$APP_DIR/services" 2>/dev/null || true)
if [[ -z "$SQLA_HITS" ]]; then
    ok "services/ is free of SQLAlchemy imports"
else
    fail "SQLAlchemy leaked into services/ — services must use repository protocols only"
    echo "$SQLA_HITS" | sed 's/^/    /'
fi

# ---- 2. No dict returns from providers (warn) ---------------------------
header "[2/6] No raw dict returns from providers/"
DICT_HITS=$(grep -rn -E "^\s*return\s*\{" "$APP_DIR/providers" 2>/dev/null || true)
if [[ -z "$DICT_HITS" ]]; then
    ok "providers/ returns only domain types"
else
    warn "providers/ may be returning raw dict (Principle 3 — Anti-Corruption Layer)"
    echo "$DICT_HITS" | sed 's/^/    /'
fi

# ---- 3. No fat routers (warn if >5 def in one file) ---------------------
header "[3/6] Routers stay thin (≤5 function definitions per file)"
FAT_ROUTERS=0
while IFS= read -r -d '' f; do
    count=$(grep -cE "^\s*(async\s+)?def\s+" "$f" || true)
    if (( count > 5 )); then
        warn "$(realpath --relative-to="$ROOT" "$f" 2>/dev/null || echo "$f"): $count function definitions (move logic to service)"
        FAT_ROUTERS=$((FAT_ROUTERS+1))
    fi
done < <(find "$APP_DIR/routers" -type f -name "*.py" -print0 2>/dev/null)
if (( FAT_ROUTERS == 0 )); then
    ok "all routers are thin"
fi

# ---- 4. File size check --------------------------------------------------
header "[4/6] File size: warn >400 lines, error >600 lines"
LARGE_FILES=0
HUGE_FILES=0
while IFS= read -r -d '' f; do
    lines=$(wc -l < "$f" | tr -d ' ')
    rel="$(realpath --relative-to="$ROOT" "$f" 2>/dev/null || echo "$f")"
    if (( lines > 600 )); then
        fail "$rel: $lines lines (>600 — split this module)"
        HUGE_FILES=$((HUGE_FILES+1))
    elif (( lines > 400 )); then
        warn "$rel: $lines lines (>400 — consider splitting)"
        LARGE_FILES=$((LARGE_FILES+1))
    fi
done < <(find "$APP_DIR" -type f -name "*.py" -print0)
if (( LARGE_FILES == 0 && HUGE_FILES == 0 )); then
    ok "all Python files ≤400 lines"
fi

# ---- 5. No bare `except:` ------------------------------------------------
header "[5/6] No bare 'except:'"
BARE_EXCEPT=$(grep -rn -E "^\s*except\s*:" "$APP_DIR" 2>/dev/null || true)
if [[ -z "$BARE_EXCEPT" ]]; then
    ok "no bare except clauses"
else
    fail "bare except found — always catch a specific exception"
    echo "$BARE_EXCEPT" | sed 's/^/    /'
fi

# ---- 6. Single-Writer: repo.hold( only in services/credits/user.py -----
header "[6/6] Single-Writer: 'repo.hold(' only in services/credits/user.py"
HOLD_HITS=$(grep -rln "repo\.hold(" "$APP_DIR/services" 2>/dev/null || true)
ALLOWED="$APP_DIR/services/credits/user.py"
VIOLATORS=""
if [[ -n "$HOLD_HITS" ]]; then
    while IFS= read -r f; do
        abs="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
        if [[ "$abs" != "$ALLOWED" ]]; then
            VIOLATORS+="$f"$'\n'
        fi
    done <<< "$HOLD_HITS"
fi
if [[ -z "$VIOLATORS" ]]; then
    ok "repo.hold() called only from services/credits/user.py"
else
    fail "Single-Writer Principle violated — repo.hold() called outside services/credits/user.py:"
    echo "$VIOLATORS" | sed 's/^/    /'
fi

# ---- summary -------------------------------------------------------------
header ""
header "Summary: ${GREEN}${PASS} passed${RESET}, ${YELLOW}${WARN} warnings${RESET}, ${RED}${FAIL} failures${RESET}"
header ""

if (( FAIL > 0 )); then
    exit 1
fi
exit 0
