# Project Bootstrap

---

## Company Standards

See @claude_instructions/project-structure.md for directory layout and naming conventions.
See @claude_instructions/coding-guidelines.md for code style, naming, and engineering standards.
See @claude_instructions/system-architecture.md for architecture patterns, subsystem design, and terminology.
See @claude_instructions/operational-directives.md for Claude Code behavioral expectations and efficiency rules.
See @claude_instructions/Phases.md for how Claude Code should approach this project by following the iteration tasks.

---

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

**Last updated:** YYYY-MM-DD

### Completed
- (nothing yet)

### In Progress
- (nothing yet)

### Blocked / Pending Engineer Input
- (nothing yet)

### Known Issues
- (nothing yet)
