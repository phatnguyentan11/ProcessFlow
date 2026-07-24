# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Derived from the global ECC rules (`~/.claude/rules/ecc/`). These are the project-scoped, non-negotiable conventions for this repository.

---

## SUPREME RULE — Plan-First + APPROVED Gate

**Never write, edit, create, or delete any file before presenting a plan and receiving a clean `APPROVED`.** (Rules `ECC-PLAN-001`, `ECC-IMPL-001`)

Flow:

```
TASK → WRITE PLAN → PRESENT ("Type APPROVED to proceed") → WAIT
   APPROVED (standalone, exact) → EXECUTE
   anything else / APPROVED + changes → UPDATE PLAN → loop
```

- `APPROVED` must be case-sensitive, trimmed, standalone — no other words.
- `APPROVED` + a change request = **NOT approved** → update the plan, re-present, wait again.
- No exceptions, even for one-line or "obvious" fixes.
- After approval, execute **exactly** the approved plan — no scope creep. Discover more work? Finish the approved scope, then plan the new change separately.

**Plan must include:** scope (what/why), affected files (every create/modify/delete), risks + rollback, verification steps, docs impact.

**Exception:** purely conversational answers or docs-only changes with zero code/config impact don't need a formal plan.

---

## Pre-Code Checklist — YAGNI / KISS / DRY

Run before presenting any code in a plan. A violation blocks the plan until resolved.

- **YAGNI** — Build only what the current task explicitly requires. Remove anything "just in case."
- **KISS** — Simplest solution that works. A junior dev should understand it without explanation.
- **DRY** — Search for existing logic first. Reuse or extract shared code before copy-pasting.

---

## Coding Style

- **Immutability (critical):** create new objects, never mutate in place — return copies.
- **Small files > large files:** 200–400 lines typical, **800 max**; organize by feature/domain, not by type.
- **Functions:** `< 50 lines`; split larger ones.
- **Nesting:** max 4 levels — prefer early returns.
- **No magic numbers:** use named constants.
- **Error handling:** explicit at every level; never silently swallow errors.
- **Input validation:** validate all external data at system boundaries; fail fast.

**Naming:** `camelCase` (vars/functions), `PascalCase` (types/interfaces/components), `UPPER_SNAKE_CASE` (constants), `use`-prefixed hooks, `is/has/should/can` booleans.

---

## Testing

- **Minimum 80% coverage.** Unit + integration + E2E for critical flows.
- **TDD:** write failing test (RED) → minimal implementation (GREEN) → refactor (IMPROVE).
- Fix implementation, not tests — unless the test itself is wrong.
- Use **AAA** (Arrange-Act-Assert); descriptive behavior-based test names.

---

## Security (before any commit)

- No hardcoded secrets — use environment variables; validate required secrets at startup.
- Parameterized queries only (no string-concatenated / template-literal SQL).
- Validate all user input; sanitize HTML (no unescaped `innerHTML` / `dangerouslySetInnerHTML`).
- Never log or return sensitive data (passwords, tokens, keys, PAN, CVV).
- No permission-bypass flags (`--dangerously-skip-permissions`, `bypassPermissions`).
- On finding a security issue: **stop**, use the `security-reviewer` agent, fix CRITICAL before continuing, rotate exposed secrets.

---

## Git Workflow

Conventional commits: `<type>: <description>` — types: `feat, fix, refactor, docs, test, chore, perf, ci`.

- Never use destructive push flags (`--force`, `-f`, `--no-verify`).
- PRs: analyze full commit history, use `git diff <base>...HEAD`, write a comprehensive summary + test plan, push new branches with `-u`.

---

## Agents & Workflow

Immediate agent usage (no prompt needed): **planner** (complex features), **code-reviewer** (after writing code), **tdd-guide** (bug fix / new feature), **architect** (architectural decisions), **build-error-resolver** (build fails), **security-reviewer** (before commits).

Run independent agent tasks in **parallel**.

Feature pipeline: **Research & Reuse** (search existing implementations / libraries first) → **Plan** → **TDD** → **Code Review** → **Commit**.

---

## Review Severity

| Level | Action |
|-------|--------|
| CRITICAL | **BLOCK** — must fix before merge |
| HIGH | **WARN** — should fix before merge |
| MEDIUM | **INFO** — consider fixing |
| LOW | **NOTE** — optional |

---

## Project Commands

> No build system or source code exists in this repository yet. Update this section with build, lint, test, and run commands once the project is scaffolded.
