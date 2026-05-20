# AI Spec

Implementation contract for the AI layer. Tracks prompts, inputs, outputs
and safety rules. See TZ §13 for product intent.

## Architecture

- LLM provider is **pluggable**. Configuration in `.env`:
  - `AI_PROVIDER=openai|anthropic|local|none`
  - `AI_API_KEY=…`
  - `AI_MODEL=…`
- AI calls happen in `apps/worker` (long-running jobs) — never inline in
  HTTP request handlers.
- Prompts live in `packages/ai-prompts/prompts/*.md` with templating
  variables in `{{var}}` form (no Handlebars; simple string replace).

PH-1-010 implements the first production path:

1. `POST /ai/reports/generate` validates `GenerateWeeklyAiReportSchema` and
  creates an `AIReport` row with status `queued`.
2. API snapshots training sessions, drill executions, matches, calendar
  events, lifestyle factors, supplement periods and recent prior AI reports
  for the requested period.
3. API stores `sourceDataJson`, `sourceDataHash`, `dataSourcesJson`,
  `promptVersion`, `provider` and `model`, then enqueues BullMQ job
  `generate-weekly-summary` on `ai-report-generation`.
4. `apps/worker` marks the row `running`, renders `weekly-summary.md`, writes
  the markdown result and marks the row `completed`; errors mark the row
  `failed` with `errorMessage`.

When `AI_PROVIDER=anthropic` and `AI_API_KEY` exists, the worker calls
Anthropic Messages API. For `AI_PROVIDER=local|none`, missing keys, or other
providers not yet implemented, it writes a deterministic local markdown
summary that preserves the same safety constraints and clearly states limited
confidence.

`POST /ai/reports/generate` is throttled to 3 requests/minute. The API creates
the BullMQ queue lazily on generation requests, so ordinary API startup and
non-AI endpoints do not require a live Redis connection. Worker prompt loading
tries workspace-root and compiled paths before falling back to a minimal
safety-preserving template.

## Prompts

| File | Purpose | Inputs | Output format |
| --- | --- | --- | --- |
| `weekly-summary.md` | Weekly training summary | training sessions, drill executions, wellness flags | Markdown with fixed sections |
| `coach-handover.md` | Briefing for a new coach | full player history | Markdown |

Adding a prompt: drop a markdown file, register it in `packages/ai-prompts/src/index.ts`,
add a row to this table.

## Safety

- Never emit medical claims or supplement advice. Reject prompts that ask for it.
- Correlations are phrased as "observed alongside", never "caused by".
- Every generated report must store: `period_start`, `period_end`,
  `source_data_hash`, `prompt_version`, `model`, `provider`.
- Wellness and supplement fields are neutral context only. Reports may mention
  that records existed, but must not make medical claims or recommend dosage,
  supplements, treatment or recovery actions.
- If input data is below thresholds (e.g. <3 sessions in a week), the
  output must say so and avoid trend statements.

## Future

- Embeddings + pgvector for RAG over coach notes.
- Per-player fine-tuning is **not** planned.
