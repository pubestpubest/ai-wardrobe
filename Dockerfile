FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

# VITE_* are inlined into the CLIENT bundle by Vite at BUILD time (not runtime),
# so they must be present here. These are the PUBLIC Supabase project URL +
# publishable (anon) key — safe to ship in-client. Override with
# `docker build --build-arg VITE_SUPABASE_URL=...` or move to CI secrets if preferred.
ARG VITE_SUPABASE_URL=https://ffcbieqkdxzrwuxdxree.supabase.co
ARG VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_17J3Ad0YxOAa7ItlnNk9Wg__duubk0Y
ARG VITE_SUPABASE_PROJECT_ID=ffcbieqkdxzrwuxdxree
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/node_modules /app/node_modules
COPY prod.ts .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "prod.ts"]
