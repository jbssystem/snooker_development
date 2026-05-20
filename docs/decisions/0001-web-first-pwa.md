# ADR-0001 — Web-first PWA with Next.js + NestJS monorepo

Date: 2026-05-20
Status: Accepted

## Context

TZ §5–6 evaluates web-first vs native-first. The product is used by
coaches on tablets, parents on phones, and analysts on desktops. AI
coding agents will produce much of the code.

## Decision

- Web-first PWA (Next.js 15, App Router).
- Backend: NestJS (TypeScript) over .NET, for single-language stack and
  agent ergonomics.
- pnpm monorepo with `apps/*` and `packages/*`.
- Mobile shells via Capacitor — deferred to Phase 2+.

## Consequences

- Faster initial velocity.
- Single TypeScript toolchain.
- Mobile parity is achieved through PWA install + Capacitor wrapping.
- Native-only features (file system, deep camera) are out-of-scope for MVP.
