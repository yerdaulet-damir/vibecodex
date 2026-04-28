# Contributing to vibecodex

Thanks for considering a contribution. This repo is a **production architecture bible** — keep that bar in mind. We accept changes that make the principles more correct, more discoverable, or more directly applicable to AI-assisted development.

---

## What we accept

| Type | Examples |
|------|----------|
| **Refinement of an existing principle** | Better before/after example, clearer prose, fixed mistake |
| **Stack expansion** | Reference app for a new framework (Rust/Axum, Elixir/Phoenix, Bun/Hono) following the same Decomposition + Integration split |
| **New Claude / Cursor skills** | A skill that solves a recurring AI-coding failure, follows the existing skill format |
| **Translations** | `docs/principles/*.md` translated to another language under `docs/<lang>/` |
| **Lint script improvements** | Additional architecture rules in `scripts/lint-architecture.sh` |

## What we don't accept

- **A 19th FastAPI principle** without retiring an existing one. The count is intentional.
- Framework-of-the-month additions without a working reference app.
- Generic "best practices" that aren't specific to AI-assisted coding failure modes.
- Style-only changes (renaming variables, reformatting prose) without rationale.

---

## Pull request guide

1. **Open an issue first** for anything beyond a typo or doc fix. Get alignment on direction before writing code.
2. **One PR = one principle / skill / app.** Don't bundle.
3. **Update both the doc and the example.** A new principle in `docs/principles/*.md` must be demonstrated in the matching reference app.
4. **Run the lint script** if you touched `reference/app/`:
   ```bash
   bash scripts/lint-architecture.sh
   ```
   Must exit 0.
5. **Keep PR descriptions tight.** State the problem, the change, why it belongs in vibecodex.

---

## Adding a new reference application

To add a new stack (e.g. Rust/Axum):

1. Create `examples/<stack>/` with a minimal but complete app demonstrating each relevant principle.
2. Add `docs/principles/0X-<stack>-decomposition.md` and `0Y-<stack>-integration.md` mirroring Parts A/B (FastAPI) or C/D (Next.js) or E/F (Go).
3. Add corresponding skills under `.claude/skills/<skill>-<stack>/`.
4. Update the README's principle index table and `llms.txt`.

Match the existing voice: dense, specific, with before/after code, no marketing fluff.

---

## Code of conduct

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

By contributing, you agree your contributions are licensed under the [MIT License](LICENSE).
