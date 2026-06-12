# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# ─── Stage 2: TypeScript build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json .
COPY src ./src/
COPY package*.json ./

RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY scripts ./scripts/
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Non-root user for security
RUN addgroup -g 1001 -S appgroup \
 && adduser  -S -u 1001 -G appgroup appuser \
 && chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["./entrypoint.sh"]
