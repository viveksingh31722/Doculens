# Document-to-Action Project Assistant — PDA

An AI-powered grounded document analysis, schedule conflict verification, and human-in-the-loop project summary generator built on Next.js (App Router), TypeScript, and PostgreSQL.

Live URL: [https://pda-doc-to-action.vercel.app](https://pda-doc-to-action.vercel.app) *(Example placeholder url)*

## 1. System Architecture and Stack

```mermaid
flowchart TD
  U[Human Reviewer] -->|Web Browser| NextUI[Next.js App Router Web UI]
  NextUI -->|API Requests| RouteHandlers[Next.js Route Handlers]
  RouteHandlers -->|Query / Save| PostgreSQL[(PostgreSQL Database)]
  RouteHandlers -->|Ingest DOCX/TXT/MD| Parser[Docx & Text Parser / Sectioner]
  RouteHandlers -->|Structured Completion| OpenAI[OpenAI Chat Completions]
  RouteHandlers -->|Verify Citations| Validator[Citation & Whitespace Validator]
  RouteHandlers -->|Structured Logs| Logger[Pino Structured Logger]
```

### Technology Choices
- **Frontend & Backend**: Next.js 16.2 (App Router) + React 19 + TypeScript.
- **Styling**: Tailwind CSS v4 (providing glassmorphic overlays and modern dark themes).
- **ORM & Database**: Prisma 7 + PostgreSQL (isolating data in `pda_db` schema).
- **Driver Adapter**: Prisma 7 native `@prisma/adapter-pg` + `pg` Pool for robust PostgreSQL connectivity.
- **LLM API**: OpenAI Chat Completions API with fallback to deterministic mock extraction for seamless offline evaluation.
- **Logging**: Pino JSON-structured logging mapped to request IDs.
- **Tests**: Vitest + JSDOM for backend API and utility unit tests.

---

## 2. Local Setup and Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL running locally (default: `localhost:5432`)

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set:
```dotenv
DATABASE_URL="postgresql://postgres:password@localhost:5432/pda_db?schema=public"
OPENAI_API_KEY="sk-your-openai-key-or-dummy-for-mock"
OPENAI_MODEL="gpt-4o-mini"
```

### 3. Generate Database Client & Run Migrations
Prisma 7 uses a central `prisma.config.ts` configuration. Simply run:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 3. How to Demo the Core Workflow

PDA includes a **self-seeding feature** that automatically populates the workspace with a demo project `Website Checkout Refresh` on the first load of the dashboard, meaning no manual database seeding is required!

1. **Open the Dashboard**: The `Website Checkout Refresh` project will appear automatically.
2. **Open Project**: Click **Open Project** to inspect the 3 ingested files:
   - `launch specs draft.txt` (defines launch as October 10th)
   - `marketing update.md` (defines launch event as October 12th)
   - `meeting notes.txt` (repeated launch specs statement: launch on October 10th)
3. **Run AI Analysis**: Click **Run Grounded AI Analysis**. This triggers structured extraction (using mock data if no OpenAI key is set, or calling OpenAI).
4. **Inspect Citations**: Click **Open Review Queue**. In the **AI Findings** tab, click any citation badge (e.g. `launch specs draft.txt (Introduction)`) to open the **Source Grounding Drawer** showing the exact quote highlighted inside its section content.
5. **Resolve Conflicts**: Go to the **Conflicts** tab. A scheduling conflict will be listed because of the discrepancy between Oct 10 and Oct 12 launch dates. Enter a resolution note (e.g., "Specs date takes precedence") and click outside or press Enter to resolve the conflict.
6. **Review Action Proposals**: Go to the **Action proposals** tab. Click **Approve** on the "Coordinate with marketing" action, and edit/reject others.
7. **Finalize Summary**: Click **Finalize & View Summary**. An executive report is generated entirely from the resolved/approved database records.
8. **Export PDF**: Click **Print / Export PDF**. A print stylesheet formats the report into a clean, executive printout layout.

---

## 4. Grounded AI Workflow and Safety Guardrails

- **Immutable Grounding**: The LLM receives document sections with unique IDs. Every extracted item must cite these IDs and quote the exact text.
- **Verification Pipeline**: The route handler checks if the `sectionId` exists and verifies that the cited quote is a substring of the section content (handling whitespace differences). Invalid citations are discarded.
- **Duplicate & Conflict Detection**: Deduplicates findings of the same kind by normalized statement similarity. Conflicting launch dates are automatically grouped and flagged as unresolved schedule conflicts.
- **Human-in-the-Loop**: All AI findings are proposals. An action item is never assigned or created in external systems automatically; only explicit human approval moves it to the summary.

---

## 5. Scope Boundaries

### Completed Scope (P0 & P1)
- Parsing of `.txt`, `.md`, and `.docx` (via `mammoth`).
- Ingestion limit: max 3 documents per project.
- Structured AI analysis, deduplication, and schedule conflict detection.
- Human review queue: inline edits, classification changes, and action approval.
- Grounding context drawer with document-highlighted quotes.
- Immutable, versioned summaries generated from reviewed records.
- JSON-structured Pino logs with `requestId`.
- Comprehensive test coverage using Vitest.

### Intentionally Excluded Scope
- Vector database / embeddings search.
- PDF OCR and scanned image processing.
- User authentication and multi-user collaboration.
- External task tracker assignment integrations.

---

## 6. Test Suite and Verification

Run all test suites including parser, upload checks, conflict checks, and summary validations:
```bash
npm run test
```
Run linter and typecheck:
```bash
npm run lint
npm run typecheck
```
Build for production:
```bash
npm run build
```
