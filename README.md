# Digital Wardrobe

AI-powered wardrobe manager with outfit stylist — built with TanStack Start, Supabase, and Google Gemini 2.5 Flash.

## Stack

| Layer           | Tech                                          |
| --------------- | --------------------------------------------- |
| Framework       | TanStack Start (React SSR)                    |
| Styling         | Tailwind CSS v4 + shadcn/ui                   |
| AI              | Google AI Agent Platform — `gemini-2.5-flash` |
| Database        | Supabase (PostgreSQL)                         |
| Package manager | Bun                                           |
| Container       | Docker + docker-compose                       |

---

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for containerized run)
- Google AI Agent Platform API key
- Supabase project ([create one free](https://supabase.com/dashboard))

---

## Local Development

### 1. Install dependencies

```bash
bun install
```

### 2. Set environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
# Google AI Agent Platform key
AGENT_PLATFORM_API_KEY=AQ.your-key-here

# Supabase — from your project's Settings > API
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

### 3. Start dev server

```bash
bun run dev
```

App is available at **http://localhost:3000**

---

## Docker (Production)

### Build and run

```bash
docker compose up --build
```

App is available at **http://localhost:3000**

### Run in background

```bash
docker compose up --build -d
docker compose logs -f   # tail logs
docker compose down      # stop
```

> The container reads from `.env` automatically via `env_file` in `docker-compose.yml`.

---

## Supabase Setup

The app **auto-migrates the database on startup** — no manual SQL needed. Just add `DATABASE_URL` and the tables will be created on first run.

### 1. Get the connection string

Supabase dashboard → **Settings → Database → Connection string → Transaction Pooler (port 6543)**

It looks like:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 2. Add it to `.env`

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@...
```

### 3. Start the app — migrations run automatically

```bash
bun run dev
```

On startup you'll see:

```
[migrate] running 001_init.sql
[migrate] 001_init.sql done
```

Each migration file in `supabase/migrations/` runs exactly once (tracked in `public._migrations`). Adding new `.sql` files is enough to ship schema changes.

### 4. Regenerate TypeScript types (after schema changes)

```bash
supabase gen types typescript --project-id ffcbieqkdxzrwuxdxree > src/integrations/supabase/types.ts
```

---

## Project Structure

```
src/
├── components/
│   ├── StylistChat.tsx      # AI stylist chat interface
│   ├── UploadItem.tsx       # Photo upload + AI auto-tag
│   └── WardrobeCard.tsx     # Item card
├── lib/
│   ├── stylist.functions.ts # Server fn — Gemini chat
│   ├── analyze.functions.ts # Server fn — Gemini vision + tool call
│   └── wardrobe.ts          # Types + seed data
├── hooks/
│   └── use-wardrobe.ts      # localStorage state (migrate to Supabase later)
├── integrations/supabase/   # Supabase client + types
└── routes/
    ├── __root.tsx           # Root layout
    └── index.tsx            # Home / dashboard
```

---

## Available Scripts

```bash
bun run dev        # Dev server with HMR
bun run build      # Production build → .output/
bun run start      # Run production build (after bun run build)
bun run lint       # ESLint
bun run format     # Prettier
```

---

## Environment Variables Reference

| Variable                        | Required | Description                                             |
| ------------------------------- | -------- | ------------------------------------------------------- |
| `AGENT_PLATFORM_API_KEY`        | Yes      | Google AI Agent Platform API key                        |
| `DATABASE_URL`                  | Yes\*    | Supabase direct connection URI — enables auto-migration |
| `SUPABASE_URL`                  | Yes      | Supabase project URL                                    |
| `SUPABASE_PUBLISHABLE_KEY`      | Yes      | Supabase anon/public key                                |
| `VITE_SUPABASE_URL`             | Yes      | Same as above (exposed to browser)                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes      | Same as above (exposed to browser)                      |
| `VITE_SUPABASE_PROJECT_ID`      | Yes      | Supabase project ref ID                                 |

> `DATABASE_URL` is only needed server-side for migrations. Without it the app still runs but skips DB setup.
