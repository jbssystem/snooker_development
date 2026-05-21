FROM node:20-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/snooker-domain/package.json packages/snooker-domain/
COPY packages/ai-prompts/package.json packages/ai-prompts/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @snooker/api prisma:generate \
 && pnpm --filter @snooker/worker build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S worker -G nodejs
COPY --from=build --chown=worker:nodejs /app /app
WORKDIR /app/apps/worker
USER worker
CMD ["node", "dist/main.js"]
