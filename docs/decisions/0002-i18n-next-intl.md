# ADR-0002 — i18n with next-intl, RU default, EN + UK from day one

Date: 2026-05-20
Status: Accepted

## Context

Product must ship in three languages from MVP: Russian (default),
English, Ukrainian.

## Decision

- Library: `next-intl`.
- Locales: `ru` (default), `en`, `uk`.
- URL prefix always present (`/ru/...`, `/en/...`, `/uk/...`).
- All user-visible strings live in `apps/web/messages/{locale}.json`.
- Rule: every key must exist in all three files in the same change.
  Untranslated copy is marked `[TODO]` but the key is present.
- AI prompt templates accept a `{{locale}}` placeholder to localize
  generated reports.

## Consequences

- New strings cost slightly more (3 files), but later locale audits are trivial.
- Locale-prefixed URLs simplify caching and routing.
- API stays language-agnostic and returns error `code`s the web translates.
