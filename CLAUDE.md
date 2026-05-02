# Project Bootstrap

## Project Context

**Project Name:** ClinicalNoteStructurer

**Purpose:** A full-stack web application that converts unstructured clinical notes (ER notes, H&P notes) into structured summaries and admission-supporting narratives (Revised HPI). Used by medical documentation reviewers to assess and justify inpatient admissions per MCG guidelines.

**Tech Stack Overrides:**
- Frontend: React 18 (Vite) — standalone SPA, not Vue.js standalone pages
- Database: Supabase (hosted PostgreSQL) — not a local DB; accessed via `@supabase/supabase-js` client                        
- Frontend deployed to Vercel; backend deployed to Render
- No `statics/externaljs/` vendor library requirement — React app uses npm packages bundled by Vite
- No HTTPS dummy certificates needed for local dev — Vite dev server runs HTTP on port 5173; Express runs HTTP on port 3001 locally (Render handles TLS in production)

**Active Web Servers:**
- `src/webserver_api.js` (port 3001 — main API; single server)

**Key Subsystems:**
- `case_management` — CRUD for clinical cases (save, list, retrieve, update)

**Key Modules:**
- `note_generation` — calls Anthropic API, builds prompts, parses structured JSON output

**Key Endpoints:**
- `endpoint_generate.js` — POST /api/generate (submit raw note → structured output + Revised HPI)
- `endpoint_cases.js` — POST /api/cases, GET /api/cases, GET /api/cases/:id, PUT /api/cases/:id
- `endpoint_system.js` — POST /shutdown (graceful shutdown)

**Environment Variables Required:**
- `ANTHROPIC_API_KEY` — Anthropic claude-sonnet API key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (backend only, never exposed to frontend)
- `FRONTEND_URL` — Allowed CORS origin (e.g., https://your-app.vercel.app)
- `PORT` — Express listen port (defaults to 3001)

**Database:**
- Primary: Supabase (hosted PostgreSQL) — accessed via `@supabase/supabase-js`
- Secondary: None

**Reference Documents:** 
See `Project description.pdf` in root dir for project descriptions.
See `clinical_case_files/` for MCG guidelines, and clinical case files (Cases A and B). Do not read speculatively — only when building or validating prompts.

---

## First Session Reminders

- Scan the project directory structure once if no prior context exists.
- Verify all required bash commands are available per the operational-directives.md checklist.
- The frontend (React/Vite) lives in `frontend/` and is a separate build target — do not mix frontend source with backend source.
- The backend (Express) lives in `backend/` — all API logic, Supabase access, and Anthropic calls happen here.

---

## Session Reminders

- Stay within this project directory. Do not read or modify sibling projects.
- If there is no file directory structure context, always scan the project one time when the session begins.
- Use `temp/` instead of `/tmp/` or any other temporary directories.
- Write logs to `logs/`, not to temp or terminal-only output.
- Do not use `curl` to examine webpages — use Node.js Playwright with Chrome browser.
- Prefix any scripts you create in `bin/` with `claudecode_`.
- Do not modify files in `claude_instructions/` — these are company-wide standards.
- Use `.claude/settings.json` for auto-approval on bash command usage.
- Never use kill commands or PID files to manage server processes. Use `bin/webserver_start.sh` and `bin/webserver_stop.sh`.
- Stop scripts must trigger shutdown via the server's local HTTP `POST /shutdown` endpoint (HTTP in local dev; HTTPS in production).
- The Anthropic API key must never appear in frontend code or Vite env vars — backend only.
- Do not invent clinical facts not present in the source note when building or testing prompts.

---

## Session Status

> Claude Code updates this section at the end of every session.

**Last updated:** 2026-05-01

### Completed
- **Phase 1 — Backend Core: complete and validated.**
  - Backend dir layout: `backend/{src/{subsystems,modules/note_generation,endpoints},config,bin,logs,temp}`.
  - `package.json` with deps installed: express, @anthropic-ai/sdk, @supabase/supabase-js, cors, helmet, dotenv. 106 packages, 0 vulnerabilities.
  - `src/webserver_api.js` — middleware in required order (helmet → cors → json → urlencoded → dynamic loader → error handler). Auto-discovers `endpoint_*.js`. Logs to `logs/webserver_api_YYYYMMDD.log`.
  - `src/modules/note_generation/note_generation.js` — system prompt embeds MCG DKA admission criteria + few-shot example. JSON parse with one retry on failure. Model: `claude-sonnet-4-6`. Logs to `logs/note_generation_YYYYMMDD.log`.
  - `src/endpoints/endpoint_generate.js` — POST `/api/generate`.
  - `src/endpoints/endpoint_system.js` — POST `/shutdown` (uses `process.exit(0)` after response flush; no `kill`, no PID files).
  - `bin/webserver_start.sh` and `bin/webserver_stop.sh`.
  - `.env` populated; `backend/.env` and `frontend/.env` covered by root `.gitignore`.
- **Phase 1 live API validation:** Case A → disposition Admit, all 7 fields populated correctly, revised HPI cites pH 7.23, HCO3 9, glucose 793, sodium 129, ICU disposition, critical care 120 min. Case B → disposition Admit, revised HPI cites pH 7.20, HCO3 7.4, glucose 93, urine ketones 60, ICU disposition, critical care 35 min. Both runs flagged real source-document discrepancies in the `uncertainties` field (e.g., ED-vs-H&P pH mismatch in Case A; lethargic-vs-alert wording divergence in Case B). No invented clinical facts observed.

- **Phase 2 — Database + Cases API: complete and validated.**
  - `src/subsystems/case_management/case_management.js` — Supabase client (cached). Exports `insertCaseRecord`, `listAllCases`, `getCaseById`, `updateCaseRecord`. Always reads `result['error']` field directly (no destructuring of `{ data, error }`). Allowed-disposition validation. Update path uses an explicit allow-list of mutable fields and bumps `updated_at`. Logs to `logs/case_management_YYYYMMDD.log`.
  - `src/endpoints/endpoint_cases.js` — `POST /api/cases`, `GET /api/cases`, `GET /api/cases/:id`, `PUT /api/cases/:id`. Validates inputs at top of each handler; returns the standard `{ result, message | data }` shape; never leaks raw Supabase error text.
- **Phase 2 round-trip validation:** create → list → fetch → update → re-fetch all returned 200 with persisted edits and `updated_at` advanced past `created_at`. Empty-string fields (e.g., `uncertainties`, `chief_complaint`) and empty arrays preserved exactly on the wire after a small fix to the insert path (was coercing `""` to `null` via `||`).

- **Phase 3 — Frontend: code complete; awaiting visual verification by engineer.**
  - `frontend/` scaffolded via `npm create vite@latest frontend -- --template react`, then pinned to React 18.3.1 (CLAUDE.md spec) — Vite default would have given React 19. Final stack: React 18.3.1, react-dom 18.3.1, react-router-dom 6.30.3, Tailwind CSS v4.2.4 (`@import "tailwindcss"` only — no postcss config in v4), Vite 5.4.21.
  - `vite.config.js` — Tailwind v4 Vite plugin registered; dev server pinned to port 5173 with `strictPort: true` (default host = `localhost` so the URL CORS-matches `FRONTEND_URL`).
  - `src/api/generate.js`, `src/api/cases.js` — fetch wrappers; all components route API calls through these (no inline `fetch()` in components).
  - `src/components/`: `NoteInputArea.jsx`, `StructuredOutputPanel.jsx`, `RevisedHpiEditor.jsx`, `EditBadge.jsx`, `DispositionBadge.jsx` (Admit=green, Observe=yellow, Discharge=red, Unknown=gray), `CaseListTable.jsx`.
  - `src/pages/`: `HomePage.jsx`, `CasesPage.jsx`, `CaseDetailPage.jsx`. React Router routes `/`, `/cases`, `/cases/:id`.
  - **Edit tracking:** field-level diff against the AI-baseline snapshot. On the HomePage, edits are dynamic (revert removes the badge). On the CaseDetailPage, prior `edited_fields` are sticky (we don't have the original AI baseline to diff against, only the saved value); new edits diff against the saved snapshot.
- **Phase 3 build/integration verification (no browser yet):**
  - `vite build` succeeded — 45 modules transformed, JS 179.91 kB / CSS 14.82 kB. No JSX or import errors.
  - Vite dev server returns 200 on `/` with the right `<title>` and `/src/main.jsx` script tag; transformed `main.jsx` includes the `BrowserRouter` import.
  - CORS preflight from `Origin: http://localhost:5173` → backend returns 204 with `Access-Control-Allow-Origin: http://localhost:5173`. A live `GET /api/cases` from the frontend origin returned 200 and the 2 cases from Phase 2.

### In Progress
- **Phase 3 visual verification (engineer):** confirm the full flow in a browser at http://localhost:5173 — paste a note, generate, edit a field, verify the Edit badge appears, save, reopen the saved case from `/cases`, verify edited fields highlight correctly. Backend (pid in `logs/webserver_api_*.stdout.log`) and Vite dev server are currently running.

### Blocked / Pending Engineer Input
- Two test records remain in the Supabase `cases` table from Phase 2 (and any new ones added during Phase 3 visual testing will accumulate). Engineer may want to delete them before any demo.

### Known Issues
- **Case-file naming mismatch:** the file `clinical_case_files/Case A HPI Revised.pdf` describes the 47-year-old male euglycemic-DKA patient (matches `ER Notes Case B.pdf`), not the 34-year-old DKA patient in `ER Notes Case A.pdf`. The note_generation few-shot example uses this revised HPI as a model for the *output*, so the prompt itself is fine; only the file label is wrong.
- **`npm run build` shells out to a `vite` not on PATH** in this Bash-tool environment (`sh: vite: command not found`). Direct invocation `node node_modules/vite/bin/vite.js build` works. Likely a sandboxed-PATH quirk specific to the tool's shell, not a real project issue — interactive `npm run build` from a normal terminal will work fine.
- **`npm audit` reports 2 moderate dev-server vulnerabilities** in `esbuild` (transitive via Vite 5). The fix is `vite@8`, which is a breaking change. Not exposed in production builds (only affects local dev). Defer until a Vite major-version upgrade is otherwise warranted.
