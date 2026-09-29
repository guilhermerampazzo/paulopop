# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ── Todas as deps (usadas pelo builder) ──────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --no-fund

# ── Apenas deps de produção (usadas no runner) ────────────────────────────────
FROM base AS prod-deps
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --legacy-peer-deps --no-audit --no-fund

# ── Compila a aplicação ───────────────────────────────────────────────────────
FROM base AS builder
ENV NODE_ENV=production \
    DATABASE_URL=postgresql://build:***@127.0.0.1:5432/build \
    NEXTAUTH_SECRET=build-only-placeholder-secret-0123456789
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && \
    npx tsc prisma/seed.ts \
      --module commonjs --target es2020 \
      --moduleResolution node --esModuleInterop \
      --outDir dist-scripts --skipLibCheck && \
    mkdir -p public
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ── Imagem final de produção ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone (node_modules enxutos gerados pelo Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Arquivos de runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist-scripts ./dist-scripts
COPY --from=builder /app/scripts/docker-start.sh ./scripts/docker-start.sh

# prod-deps por cima do standalone — garante prisma CLI + wasm completos
# (standalone tem node_modules enxutos; prod-deps completa o que falta)
COPY --from=prod-deps /app/node_modules ./node_modules

RUN mkdir -p ./public/uploads/images ./public/uploads/documents && \
    chmod +x ./scripts/docker-start.sh && \
    chown -R nextjs:nodejs \
      ./public/uploads ./prisma ./dist-scripts \
      ./scripts ./prisma.config.ts ./node_modules

USER nextjs
EXPOSE 3000
CMD ["sh", "./scripts/docker-start.sh"]
