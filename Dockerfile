# syntax=docker/dockerfile:1
# =============================================================================
# ContextBridge — production Dockerfile (Next.js standalone)
# =============================================================================
FROM node:20-bookworm AS deps
WORKDIR /app
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
# Generate Prisma engines in the deps stage so they're cached alongside
# node_modules. Engine downloads can be flaky — retry with backoff.
COPY prisma ./prisma
RUN for i in 1 2 3 4 5 6; do \
      ./node_modules/.bin/prisma generate && break; \
      echo "prisma generate attempt $i failed — sleeping $((i * 5))s before retry"; \
      sleep $((i * 5)); \
    done

FROM node:20-bookworm AS builder
WORKDIR /app
ENV NODE_ENV=development
# NEXT_PUBLIC_* env vars are baked into the client bundle at build time.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Bind to all interfaces so Traefik (different docker network) can reach us.
ENV HOSTNAME=0.0.0.0

# Native deps for pdf-parse / mammoth at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates fontconfig \
  && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd --system --gid 1001 nodejs \
  && useradd  --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma          ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# Include the Prisma CLI so `docker compose exec contexthandoff-app npx prisma db push` works.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma     ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

ENV HOME=/app

# Pre-create the local storage dir (used when STORAGE_PROVIDER=local).
RUN mkdir -p /app/storage-local/ch-originals /app/storage-local/ch-extracts \
  && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
