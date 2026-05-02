# ClinicalNoteStructurer

Web app that converts unstructured clinical notes (ER, H&P) into a structured 7-field summary plus a Revised HPI narrative supporting inpatient admission per MCG criteria. Built for medical documentation reviewers.

## Live Demo

- **Frontend (Link to deployed application):** https://clinical-note-structurer.vercel.app
- **Backend API:** https://clinicalnotestructurer.onrender.com

> Render's free tier spins down after ~15 min of inactivity. The first request after idle takes ~30–50s to wake; subsequent requests are fast.

## Features

- Paste a raw clinical note → generate structured fields (chief complaint, HPI summary, key findings, suspected conditions, disposition, uncertainties) and a Revised HPI narrative
- Inline editing of every field; manually edited fields are visually flagged
- Save cases to Supabase; reopen and re-edit later
- Color-coded disposition badges: Admit (green), Observe (yellow), Discharge (red), Unknown (gray)

## Architecture overview

```
React SPA (Vercel)
       │  HTTPS / JSON
       ▼
Express API (Render) ───► Anthropic API (claude-sonnet-4-6)
       │
       ▼
Supabase (PostgreSQL)
```

The frontend never talks to Anthropic or Supabase directly — all secrets stay on the backend. The API is stateless; no auth.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind v4, React Router 6 |
| Backend | Node.js 20, Express 4 |
| LLM | Anthropic `claude-sonnet-4-6` via `@anthropic-ai/sdk` |
| Database | Supabase (PostgreSQL) via `@supabase/supabase-js` |
| Hosting | Vercel (frontend), Render (backend) |

### Choice explanation

- **React + Vite** over a server-rendered framework: the app is a focused single-purpose tool with three routes and no SEO requirement, so an SPA was the lightest fit. Vite gives near-instant dev startup and a small production bundle (~180 kB JS).
- **Express** over Next.js API routes or Fastify: minimal surface area for what is essentially three endpoint groups, and it deploys cleanly to Render's free tier with no special adapters.
- **Anthropic `claude-sonnet-4-6`** over GPT-class models: stronger instruction-following on long, structured-JSON outputs and better adherence to the "do not invent facts" rule in clinical text.
- **Supabase** over self-hosted Postgres or Firebase: hosted Postgres with a JS client, free tier, and a real schema (the `cases` table needs typed columns and JSONB for arrays — Firestore's document model would have been a worse fit).
- **Vercel + Render** over a single platform: Vercel is the obvious home for a Vite SPA; Render runs the long-lived Node process that Vercel's serverless model cannot host cleanly (the Anthropic call can take 10–30s, which crowds serverless function timeouts on free tiers).
- **Tailwind v4** over CSS modules: every screen is utility-class layout — there was no styling complexity that justified a separate stylesheet system.

## How I structured the clinical note

The model returns a fixed 7-field JSON schema (see `backend/src/modules/note_generation/note_generation.js`):

| Field | Purpose |
|---|---|
| `chief_complaint` | One-line reason for the visit, copied from the note |
| `hpi_summary` | 2–4 sentence condensed history |
| `key_findings` | 5–10 grouped observations (vitals, exam, labs grouped by panel — e.g. ABG values together) |
| `suspected_conditions` | Up to 5 differential or working diagnoses |
| `disposition` | Constrained to `Admit` / `Observe` / `Discharge` / `Unknown` |
| `uncertainties` | Free-text notes on documentation conflicts; empty string if none |
| `revised_hpi` | The admission-supporting narrative (see below) |

A few decisions worth calling out:

- **`disposition` is a closed enum.** The backend rejects any other value via `validateStructuredOutput()`, which prevents the model from drifting into phrases like "consider admission" that would break the color-coded UI.
- **Arrays, not bullet strings.** `key_findings` and `suspected_conditions` are JSON arrays so the frontend renders them as real list items and the database stores them as JSONB (queryable later, not just displayed).
- **Length caps in the prompt.** `revised_hpi` targets 6–10 sentences; `hpi_summary` ≤ 80 words; each `key_finding` ≤ 20 words. Without these the model produces a wall of prose that defeats the point of structuring.
- **Group related labs into one finding.** ABG panels are written as `"ABG: pH 7.20, HCO3 7.4, base excess −18.0"` rather than three separate items — the prompt explicitly instructs this so the structured view stays scannable.

## How I generated the Revised HPI

The Revised HPI is the part that justifies inpatient admission per MCG, so the prompt does three things:

1. **Embeds the MCG DKA/Diabetes admission criteria (M-130, condensed) directly in the system prompt** — pH/bicarbonate/anion-gap thresholds, ketonuria/ketonemia cutoffs, the euglycemic-DKA risk-factor list (SGLT2 inhibitors, pregnancy, starvation, etc.), and the specific factors that escalate from "DKA" to "DKA requiring inpatient management". The model maps source-note findings to these criteria rather than reasoning from general medical knowledge.
2. **One few-shot example (Case A — euglycemic DKA on Jardiance).** It shows the exact tone, the demographic-first opening, the grouped lab citations with units, the explicit naming of the diagnosis, and the final sentence connecting the picture to inpatient admission. The example carries more weight than any amount of instruction text.
3. **Explicit content rules.** Open with demographics + chief complaint, cite specific lab values with units, name the diagnosis, describe ED treatment escalation actually documented in the source, and end with a sentence that ties the clinical picture to inpatient/ICU-level admission per MCG. Padding clauses are explicitly disallowed.

On the call side: a single `claude-sonnet-4-6` call with `max_tokens: 1200`, JSON parsed with a fenced-block fallback (`tryParseJson` handles both bare JSON and JSON wrapped in stray prose), and **one automatic retry** if either the API call fails or the parsed object fails schema validation.

## How I handled uncertainty or missing information

Three layers:

1. **A dedicated `uncertainties` field.** Anything genuinely ambiguous in the source — conflicting documentation between ED and H&P, missing values, mismatched wording — goes here as free text rather than being silently resolved. During Phase 1 validation this caught a real ED-vs-H&P pH mismatch in Case A and a "lethargic" vs "alert" wording divergence in Case B without prompting.
2. **A hard "do not invent facts" rule in the prompt.** The system prompt instructs the model to omit any clinical detail not present in the source rather than infer it. The few-shot example reinforces this: every lab value cited in the example output appears verbatim in the example input.
3. **Schema validation + retry on parse failure.** `validateStructuredOutput()` checks all seven keys are present, that the array fields are arrays, and that `disposition` is one of the four allowed values. If parsing or validation fails, the module retries once; if the retry also fails, the endpoint returns a generic `{ result: 'ERROR' }` rather than leaking the malformed text. If the source genuinely doesn't support a disposition, the model is instructed to return `Unknown` rather than guess.

## Repository Layout

```
backend/    Express API, note_generation module, case_management subsystem
frontend/   React SPA — pages, components, API wrappers
clinical_case_files/   MCG guidelines and reference cases (gitignored)
```

## Local Development 

(How to run the project locally)

### Prerequisites
- Node.js 20 LTS, npm
- Supabase project with the `cases` table (schema below)
- Anthropic API key

### Backend

```bash
cd backend
npm install
# create backend/.env (see below)
./bin/webserver_start.sh
```

Listens on `http://localhost:3001`. Logs to `backend/logs/webserver_api_YYYYMMDD.log`.

`backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=http://localhost:5173
PORT=3001
```

Stop the server with `./bin/webserver_stop.sh` (calls `POST /shutdown` — never `kill`).

### Frontend

```bash
cd frontend
npm install

# run
npm run dev
# or
node node_modules/vite/bin/vite.js
```

Runs at `http://localhost:5173`.

`frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:3001
```

## Database Schema

```sql
create table cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  original_note text not null,

  chief_complaint text,
  hpi_summary text,
  key_findings jsonb,
  suspected_conditions jsonb,
  disposition text,
  uncertainties text,
  revised_hpi text,

  is_edited boolean default false,
  edited_fields jsonb
);
```

`disposition` allowed values: `Admit`, `Observe`, `Discharge`, `Unknown`.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/generate` | Submit raw note → structured output + Revised HPI |
| POST | `/api/cases` | Save a case |
| GET | `/api/cases` | List all saved cases |
| GET | `/api/cases/:id` | Fetch one case |
| PUT | `/api/cases/:id` | Update an existing case |
| POST | `/shutdown` | Graceful shutdown (local dev only) |

All responses use the shape `{ result: 'SUCCESS' | 'ERROR', data | message }`.

## Deployment

### Backend — Render
- Service type: **Web Service**
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Env vars: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`
- Do **not** set `PORT` — Render injects it.

### Frontend — Vercel
- Root Directory: `frontend`
- Framework: Vite (auto-detected)
- Env var: `VITE_API_BASE_URL` set to the Render backend URL (no trailing slash)

After both are live, set `FRONTEND_URL` on Render to the Vercel URL so CORS permits the frontend origin.

## Security Notes

- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are backend-only and must never appear in any `frontend/` file or `VITE_*` env var — Vite bundles those into the browser.
- The model is instructed to never invent clinical facts not present in the source note. Any uncertainty is surfaced in the `uncertainties` field rather than fabricated.

## AI Tools used

The architecture and tech-stack choices in this project are mine — React + Vite, Express, Supabase, Vercel + Render, the 7-field schema, the prompt design embedding MCG criteria, and the deployment topology were all decided up front before any code was generated.

I used **Claude Code** as a working partner across the build:
- **Brainstorming** — sanity-checking the schema shape, the disposition enum, and the Revised HPI content rules against the MCG criteria.
- **Project Skeleton** — once the structure was decided, generating the first pass of `webserver_api.js`, the endpoint files, the Supabase wrapper, and the React component tree per the project's coding guidelines (`claude_instructions/`).
- **Debugging** — tracking down a Supabase insert path that was coercing empty strings to `null` via `||`, a Vite-on-PATH quirk in the sandboxed shell, and CORS preflight verification between the Vite dev origin and the Express backend.

## Future improvements

1. **PDF upload of source notes.** Right now the user pastes raw text. ER notes and H&Ps in real workflows arrive as scanned PDFs from the EMR, so a parsing step (PDF text extraction, or vision-model OCR for scanned pages) would remove the manual copy step that is the biggest friction in the current flow.
2. **Case list management — delete, tag, group, search.** The cases table accumulates indefinitely with no way to clean up test records or organize real ones. At minimum: row-level delete, free-text tags (e.g. "DKA", "training set"), grouping by tag or disposition, and full-text search across `chief_complaint` and `hpi_summary`. Without these the saved-cases view stops being useful past ~20 records.
3. **Edit-history detail view on saved cases.** The `edited_fields` JSONB column already tracks which fields were manually changed, but the detail page only highlights them — it doesn't show the AI baseline vs. the human edit side-by-side. Storing the original AI output as a separate column (or a `case_revisions` table) would let reviewers see exactly what was changed and why, which is the audit trail a documentation-review workflow actually needs.