# ADR-0004 — Product scope: single player, player-owned data, Anthropic, SSH+Compose deploy

Date: 2026-05-20
Status: Accepted

## Context

Open product questions from TZ §24 needed answers to start Phase 1.

## Decision

1. **Tenancy.** MVP is built for a **single player** at a time. The data
   model already supports academies/clubs (multi-tenant ready); the UI does
   not expose them in Phase 1.
2. **Data ownership.** Data belongs to the **player** (parent acts on the
   player's behalf when the player is a minor). Coach has revocable access,
   not ownership.
3. **LLM provider.** **Anthropic** is the primary provider. The AI module
   keeps a pluggable interface (`AI_PROVIDER=anthropic|openai|local|none`)
   so the provider can be swapped without touching call sites.
4. **Deployment.** Production is shipped via the existing **SSH + Docker
   Compose** workflow used by previous projects (see user memory
   `server-deploy.md`). No GitHub Actions deploy gate; releases happen via
   `git archive` → `scp` → `docker compose up -d --build` and a one-shot
   `prisma migrate deploy`.

## Consequences

- Auth/roles are implemented from day one, but academy/club admin screens
  are deferred. The schema does not need a migration when academies become
  active.
- Wellness/supplement data is owned by the player; coach access requires an
  explicit share flag — already noted in `docs/database-model.md`.
- All AI prompts live in `packages/ai-prompts/prompts/*.md` and stay
  provider-agnostic. Anthropic-specific message formatting happens in the
  provider adapter, not in the templates.
- Production deploy is documented in `docs/deployment.md`; no CI/CD vendor
  lock-in.
