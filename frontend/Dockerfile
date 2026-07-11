FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
ENV CI=true
# Baked into .next/routes-manifest.json at build time — output: "standalone"
# does not re-evaluate next.config.mjs rewrites at runtime.
ENV API_PROXY_TARGET=http://backend:8000
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Route Handlers (app/api/**/route.ts) read this at request time via process.env,
# unlike next.config.mjs rewrites which bake it in at build time (see builder stage).
ENV API_PROXY_TARGET=http://backend:8000
RUN corepack enable pnpm
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
