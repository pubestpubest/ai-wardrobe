FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist /app/dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "dist/server/server.js"]
