FROM node:25-slim AS base
WORKDIR /app

# ------------------------------------------ #

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ------------------------------------------ #

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/package.json /app/package-lock.json ./
COPY --from=dependencies /app/node_modules/ ./node_modules/
COPY scripts/ ./scripts/
COPY src/ ./src/
RUN npm run build

# ------------------------------------------ #

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 jiflabs

COPY --from=builder --chown=jiflabs:nodejs /app/dst ./dst
COPY --from=builder --chown=jiflabs:nodejs /app/scripts/ ./scripts/

USER jiflabs

EXPOSE 3000

CMD ["node", "scripts/server.js", "--mode=production", "--dst-dir=dst", "--hostname=::", "--port=3000"]
