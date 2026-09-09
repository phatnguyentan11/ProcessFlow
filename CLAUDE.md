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

**WorkHub** — a Vietnamese-language internal process/task tracker. Plain Node.js server + vanilla-JS SPA. No build step, no bundler, no package.json, no npm dependencies.

```bash
node server.js                              # run: http://localhost:8080
PORT=3000 node server.js                    # custom port (bash)
WORKHUB_DATA=/path/to/data node server.js   # custom data dir (bash)
```

```powershell
$env:PORT = "3000"; node server.js          # custom port (PowerShell)
$env:WORKHUB_DATA = "D:\data\workhub"; node server.js
```

- Requires Node ≥ 18 (uses `for await...of`, `fsp.rm`).
- Opening `index.html` directly via `file://` breaks the Processes view — `fetch()` of `processes/*.json` is blocked by CORS. Always serve through `node server.js`.
- No test suite, linter, or build/watch tooling exists in this repo.

## Architecture

**Two runtime halves, both required together:**

1. **`server.js`** — a dependency-free Node HTTP server with two jobs:
   - Serves static files (`index.html`, `assets/`, `processes/*.json`) from the repo root.
   - Serves a small REST API (`/api/info`, `/api/tasks`, `/api/tasks/:id`, `/api/tasks/:id/files...`) that persists task data as JSON files under `./tasks/<task-id>/task.json`, with attachments in `./tasks/<task-id>/files/`. `WORKHUB_DATA` env var overrides the data root. `safeSeg()` guards every path segment against traversal (`..`, slashes).
   - There is no database — the task list on disk *is* the data model; `loadAll()` just globs every subdirectory of the data dir for a `task.json`.

2. **Front end** (`index.html` + `assets/js/*.js`) — no framework, no modules/bundler. Each `assets/js/*.js` file is an IIFE that attaches one global (`window.Store`, `window.UI`, `window.ApiStore`, `window.Processes`, `window.Pipeline`, `window.Tasks`), loaded via plain `<script>` tags in this order (dependency order matters — later files call into earlier globals):
   - `storage.js` → `Store`/`UI`: localStorage prefs/theme, export/import, and shared DOM helpers (`UI.el` for building elements, `UI.esc`/`escWithLinks` for escaping — **all dynamic content must go through these**, there's no framework auto-escaping).
   - `apistore.js` → `ApiStore`: thin `fetch()` wrapper around the server's task API.
   - `processes.js` → `Processes`: fetches `processes/index.json` (manifest — browsers can't list a directory, so new process files must be registered there) then each listed process JSON, and **generically renders arbitrary JSON** into the Quy trình (Processes) detail view — object keys become sections via `renderValue`/`renderObjectCard`, with Vietnamese labels from a `LABELS` map. Adding a new field to a process JSON schema needs no JS change; it just renders generically (add a `LABELS` entry for a nicer title).
   - `pipeline.js` → `Pipeline`: renders a task's progress across a fixed, hardcoded stage list (`CORE_STAGE_IDS`) that is a curated subset of `processes/*` ids — not all processes appear in the pipeline bar.
   - `brs.js` → `Brs`: BRS/DD documents with version history plus out-of-document changes. One collection `t.brs[]` holds both kinds, discriminated by `kind`: **DD** (from the Lead — few versions, rarely changes) and **BRS** (from the BA — many versions, changes often). `versions[0]` is the baseline and the **last version is the one to implement** ("Đang áp dụng"); every version is kept, never overwritten. `t.changes[]` holds changes not yet in a document, each carrying an `authority`: `"Quyết định Lead"` (a valid exception, may be built immediately) or `"Chờ BA cập nhật BRS"` (not yet legitimate — surfaces as a red warning badge). Document precedence, encoded throughout: **Lead decision > DD > BRS > older versions**. The "Thay đổi" timeline **merges both sources at render time** — never store a change twice. Panels receive a `ctx` object from `tasks.js` (`refresh`, `entryCard`, `fileRow`, `fileOpenBtn`, `select`) instead of importing its private helpers.
   - `sheet.js` → `Sheet`: the sub-tasks of a workboard sheet (`t.sheetTasks[]` — each with start/end dates, status, note). Every number shown (duration, days left/overdue, the `x/n xong · TB y%` roll-up) is **computed at render time**, never stored. Inline edits go through `refreshAfterMutation()` → `rerenderDetail()`, which restores the scroll position of both columns so editing a field never jumps the page back to the top (plain `renderDetail()` resets scroll, which is what you want when switching task or tab). The section has two modes: **read** (default — one compact line per sub-task, no inputs at all) and **edit** (one `✎ Sửa` button on the section header, never per row) — the mode flag lives in the module keyed by task id and is never persisted, so toggling it calls `ctx.rerender()` (redraw only) rather than `ctx.refresh()` (which would dirty `updatedAt` and write to disk). Like `brs.js` it takes a `ctx` from `tasks.js` — which also carries `today`, `dayDiff` and the shared `STATUSES` pool so date logic is not duplicated.
   - `tasks.js` → `Tasks`: the bulk of the app (~1000 lines) — task CRUD, detail tabs (overview/BRS/changes/todos/documents/integrations/notes/mails/golive), all mutating through `saveTask()` → `ApiStore.saveTask()` (optimistic, fire-and-forget to disk). Includes `migrate()` for lazily upgrading old task JSON shapes (legacy `activities` → `todos`; missing `brs`/`changes` arrays) on load. Task type drives which identity fields apply: **Feature** carries `sheet` + `boardTask` (from the lead's workboard plan), **Bug** carries `parentTaskId` linking to its Feature task.
   - `app.js`: bootstrap — wires nav/search/theme/collapse UI, calls `Tasks.init()` + `initFolder()` (checks `/api/info` to confirm the server is reachable, shows a reconnect banner if not) and `Processes.load()` (shows a `file://`/CORS guidance banner if fetch fails).

**Data model note:** process definitions (`processes/*.json`) are read-only reference content edited by hand (see `processes/readme.md` for the schema and update rules — keep `id`/`order` stable, bump `lastUpdated`/`version` on change, and register new files in `processes/index.json`). Task data (`tasks/`) is runtime-generated per-install and not meant to be hand-edited or committed.
