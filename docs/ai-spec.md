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
- If input data is below thresholds (e.g. <3 sessions in a week), the
  output must say so and avoid trend statements.

## Future

- Embeddings + pgvector for RAG over coach notes.
- Per-player fine-tuning is **not** planned.
