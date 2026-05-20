---
applyTo: "**"
---
# Documentation sync rule

Any change to code must be accompanied — in the same commit/PR — by an
update to the relevant document(s):

| Change touches… | Update… |
| --- | --- |
| Prisma schema / DB | `docs/database-model.md` |
| HTTP endpoint / DTO | `docs/api-spec.md` |
| New UI component / pattern / a11y rule | `docs/ui-guidelines.md` |
| Architecture, new package, new dependency | `docs/architecture.md` |
| Dockerfile, compose, nginx, env vars | `docs/deployment.md` |
| Locale messages, i18n approach | `docs/i18n.md` |
| AI prompt template added/changed | `docs/ai-spec.md` |
| Brand colors / logo / visual identity | `docs/brand.md` |
| Phase boundary, scope change, decision | `docs/development-log.md` (always append) |
| Irreversible decision | new `docs/decisions/NNNN-*.md` (ADR) |

A change is **not complete** if affected docs were not updated.
