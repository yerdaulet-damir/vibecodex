#!/usr/bin/env bash
# new-feature.sh — scaffold a new domain (router + service + test) from
# templates/.
#
# Usage:
#     ./scripts/new-feature.sh <domain> <action>
#
# Example:
#     ./scripts/new-feature.sh wallet refund
#
# Creates:
#     reference/app/routers/<domain>.py        (if missing)
#     reference/app/services/<domain>.py       (if missing)
#     reference/tests/unit/test_<domain>.py    (if missing)
#
# Existing files are NEVER overwritten — the script will warn and skip.

set -euo pipefail

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <domain> <action>" >&2
    echo "Example: $0 wallet refund" >&2
    exit 2
fi

DOMAIN="$1"
ACTION="$2"

# Validate identifiers (snake_case for python module names)
if ! [[ "$DOMAIN" =~ ^[a-z][a-z0-9_]*$ ]]; then
    echo "error: domain must be snake_case lowercase: '$DOMAIN'" >&2
    exit 2
fi
if ! [[ "$ACTION" =~ ^[a-z][a-z0-9_]*$ ]]; then
    echo "error: action must be snake_case lowercase: '$ACTION'" >&2
    exit 2
fi

# DomainName: PascalCase. Simple snake → Pascal conversion.
DomainName="$(echo "$DOMAIN" | awk -F_ '{for(i=1;i<=NF;i++) printf "%s%s", toupper(substr($i,1,1)), substr($i,2)}')"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATES="$ROOT/templates"
APP="$ROOT/reference/app"
TESTS="$ROOT/reference/tests"

ROUTER_OUT="$APP/routers/${DOMAIN}.py"
SERVICE_OUT="$APP/services/${DOMAIN}.py"
TEST_OUT="$TESTS/unit/test_${DOMAIN}.py"

render() {
    # Tiny jinja-like substitution: replaces {{ domain }}, {{ DomainName }}, {{ action }}
    local tmpl="$1"
    local out="$2"
    if [[ -f "$out" ]]; then
        echo "  skip: $out (already exists)"
        return 0
    fi
    if [[ ! -f "$tmpl" ]]; then
        echo "  error: template not found: $tmpl" >&2
        return 1
    fi
    mkdir -p "$(dirname "$out")"
    sed \
        -e "s/{{ domain }}/${DOMAIN}/g" \
        -e "s/{{ DomainName }}/${DomainName}/g" \
        -e "s/{{ action }}/${ACTION}/g" \
        "$tmpl" > "$out"
    echo "  created: $out"
}

echo "Scaffolding feature: domain=${DOMAIN} action=${ACTION} (DomainName=${DomainName})"
echo
render "$TEMPLATES/new_router.py.jinja"   "$ROUTER_OUT"
render "$TEMPLATES/new_service.py.jinja"  "$SERVICE_OUT"

# Optional test template — fall back to a minimal stub if the dedicated
# test template is absent.
TEST_TMPL="$TEMPLATES/new_test.py.jinja"
if [[ -f "$TEST_TMPL" ]]; then
    render "$TEST_TMPL" "$TEST_OUT"
else
    if [[ ! -f "$TEST_OUT" ]]; then
        mkdir -p "$(dirname "$TEST_OUT")"
        cat > "$TEST_OUT" <<EOF
"""Tests for the ${DOMAIN} domain."""

import pytest

pytestmark = pytest.mark.asyncio


async def test_${DOMAIN}_${ACTION}_placeholder() -> None:
    """TODO: replace with a real test for ${DomainName}Service.${ACTION}()."""
    assert True
EOF
        echo "  created: $TEST_OUT (minimal stub)"
    else
        echo "  skip: $TEST_OUT (already exists)"
    fi
fi

cat <<EOF

────────────────────────────────────────
Next steps
────────────────────────────────────────
  1. Define the repository protocol in:
       reference/app/repositories/protocols.py
     (add ${DomainName}RepoProtocol with the methods you need)

  2. Implement the SQLAlchemy repo:
       reference/app/repositories/${DOMAIN}.py

  3. Wire dependencies (Depends(get_${DOMAIN}_service)) and ensure no DB
     access from the router or service body.

  4. Write the failing test FIRST (critical-tier domains: TDD mandatory):
       ${TEST_OUT}

  5. Run:
       pytest reference/tests/unit/test_${DOMAIN}.py -v
       ./scripts/lint-architecture.sh

  6. If this domain handles money, auth, or external state, also add:
       - Idempotency key validation in the router
       - Single-Writer call site in the service
       - Provider ACL test (if calling external API)
────────────────────────────────────────
EOF
