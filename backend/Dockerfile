# ─── Stage 1: Dependencies + Prisma generate ─────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install ALL deps (dev included) so prisma generate & tsc work
RUN npm ci

# Generate Prisma client for linux-musl (alpine)
RUN ./node_modules/.bin/prisma generate

# ─── Stage 2: TypeScript build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json .
COPY src ./src/
# package.json needed for npm run build
COPY package*.json ./

RUN npm run build

# ─── Stage 3: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init openssl

WORKDIR /app

ENV NODE_ENV=production

# Copy manifests and schema before npm install so @prisma/client
# postinstall can find the schema and download the query engine
COPY package*.json ./
COPY prisma ./prisma/

# Install production deps (WITH postinstall so Prisma downloads its engines)
RUN npm ci --omit=dev

# Override the just-generated client with the one built in `deps`
# (ensures types match exactly what the code was compiled against)
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

# Application code compiled in `builder`
COPY --from=builder /app/dist ./dist

# Startup script
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
