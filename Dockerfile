FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time. Provide them as build args
# if your app needs them (e.g. NEXT_PUBLIC_APP_URL).
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

FROM base AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

ENV NODE_ENV=production
ENV PORT=3130
# Pin bind address; otherwise the standalone server binds to Docker's auto-set
# $HOSTNAME (a container ID) and becomes unreachable from outside the container.
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3130

# Use 127.0.0.1 instead of localhost to avoid Alpine IPv6 resolution issues
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3130/ >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]