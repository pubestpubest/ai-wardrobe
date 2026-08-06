# Digital Wardrobe

AI-powered wardrobe manager with an outfit stylist — built with TanStack Start, Supabase, and Google Gemini.

## Stack

| Layer           | Tech                                         |
| --------------- | -------------------------------------------- |
| Framework       | TanStack Start (React 19 SSR) + Vite 7       |
| Styling         | Tailwind CSS v4 + shadcn/ui                  |
| AI              | Google AI (Gemini) — `gemini-3.1-flash-lite` |
| Database + Auth | Supabase (PostgreSQL, Storage, Auth)         |
| Package manager | Bun                                          |
| Container       | Docker + docker-compose                      |
| CI/CD           | GitHub Actions → DockerHub → deploy webhook  |

---

## Prerequisites

- [Bun](https://bun.sh) v1.3+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for containerized run)
- Google AI (Gemini) API key
- Supabase project ([create one free](https://supabase.com/dashboard))
- OpenWeatherMap API key (for the Home weather card)

---

## Local Development

### 1. Install dependencies

```bash
bun install
```

### 2. Set environment variables

```bash
cp .env.example .env
```

Fill in the values — see the [reference table](#environment-variables-reference) below.

### 3. Start dev server

```bash
bun run dev
```

`bun run dev` runs `scripts/migrate.ts` first, then starts Vite. App is at **http://localhost:3000**.

---

## Docker

### Local build (`docker-compose.yml`, reads `.env`)

```bash
docker compose up --build
```

### Prebuilt image (`docker-compose.prod.yml`, reads `.env.docker`)

```bash
cp .env.docker.example .env.docker
make up        # docker compose --env-file .env.docker up -d --build
make logs      # tail
make ps
make restart
make down
```

Three things about the image that bite if you forget them:

- **`VITE_*` are build-time.** Vite inlines them into the client bundle during `bun run build`, so they are `ARG`/`ENV` in the builder stage of the `Dockerfile`, not runtime env. Override with `docker build --build-arg VITE_SUPABASE_URL=...`.
- **`public/` is copied into the runner.** The mock try-on / body-model server functions read static PNGs from `public/images` at runtime.
- **`prod.ts` serves `dist/client` off disk** (hashed `/assets/*` immutable, everything else 5 min) and falls through to the SSR handler on a miss. That is what serves `/poster`.

---

## CI/CD

`.github/workflows/push.yaml` — on push to `main` (skipped for `**.md`):

1. **lint** — `bun install --frozen-lockfile && bun run lint`
2. **build** — build + push `:latest` and `:<sha>` to DockerHub (registry buildcache), then a Discord notification
3. **trigger-deployment** — HMAC-SHA256-signed POST to the deploy webhook

Repo secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `DOCKERHUB_REPO`, `DISCORD_WEBHOOK_URL`, `WEBHOOK_URL`, `WEBHOOK_SECRET`.

---

## Supabase Setup

The app **auto-migrates the database on startup** — no manual SQL needed. Set `DATABASE_URL` and the tables are created on first run.

### 1. Get the connection string

Supabase dashboard → **Settings → Database → Connection string → Transaction Pooler (port 6543)**:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 2. Add it to `.env`, then start the app

```bash
bun run dev
```

On startup you'll see:

```
[migrate] running 001_init.sql
[migrate] 001_init.sql done
```

Each file in `supabase/migrations/` runs exactly once (tracked in `public._migrations`) — `001`–`016` today. Adding a new numbered `.sql` file is enough to ship a schema change.

### 3. Enable email auto-confirm

Auth is Supabase email + a 6-digit PIN. Without **auto-confirm** enabled in the dashboard, registration dead-ends at "confirm your email" and nothing behind the auth gate is reachable. See PRD §13 `AUTH-1`.

### 4. Regenerate TypeScript types (after schema changes)

```bash
supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts
```

---

## Project Structure

```
src/
├── routes/              # File-based routes: / wardrobe matches discover profile virtual-model
├── components/          # App components (UploadItem, StylistChat, OutfitCalendar, …) + ui/ (shadcn)
├── lib/                 # *.functions.ts = server functions (AI, DB, storage) + shared helpers
├── hooks/               # TanStack Query wrappers over the server functions
├── integrations/supabase/  # Browser + server clients, auth middleware/attacher, generated types
├── server.ts            # SSR handler wrapper — normalizes h3's swallowed 500s into error pages
└── start.ts             # Wires the Supabase auth attacher into the request pipeline

supabase/migrations/     # 001–016, run once each at cold start
scripts/migrate.ts       # Standalone migration runner (bun run dev calls this first)
prod.ts                  # Production entry — static file server in front of the SSR handler
public/poster/           # Standalone marketing poster, served at /poster (not a route)
loops/                   # Point-in-time build records, one per PRD backlog loop
```

Feature docs: **`PRD.md`** (product spec + implementation status + backlog), **`LOOP.md`** (the queue-drainer loop that ships the backlog), **`CLAUDE.md`** (architecture notes for coding agents).

---

## Available Scripts

```bash
bun run dev        # migrations, then Vite dev server with HMR
bun run build      # production build → dist/
bun run start      # run production build via prod.ts (after bun run build)
bun run lint       # ESLint
bun run format     # Prettier
```

> `bun run build` does **not** type-check (PRD §13 `DX-1`).

---

## Environment Variables Reference

| Variable                        | Required | Description                                                                                                             |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AGENT_PLATFORM_API_KEY_DEV`    | —        | Gemini key used when the DevTools env switcher is set to **Dev**                                                        |
| `AGENT_PLATFORM_API_KEY_UAT`    | —        | Same, for **UAT**                                                                                                       |
| `AGENT_PLATFORM_API_KEY_PROD`   | Yes      | Same, for **Prod** — the default; falls back to `AGENT_PLATFORM_API_KEY`                                                |
| `DATABASE_URL`                  | Yes\*    | Supabase transaction-pooler URI — enables auto-migration                                                                |
| `SUPABASE_URL`                  | Yes      | Supabase project URL (server-side client)                                                                               |
| `SUPABASE_PUBLISHABLE_KEY`      | Yes      | Supabase anon/publishable key                                                                                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Admin client — storage uploads, signed URLs, admin CRUD (bypasses RLS)                                                  |
| `OPENWEATHER_API_KEY`           | Yes      | OpenWeatherMap, server-side only — Home weather card                                                                    |
| `ADMIN_EMAILS`                  | —        | Comma-separated emails allowed to edit the affiliate catalog                                                            |
| `VITE_SUPABASE_URL`             | Yes      | Supabase URL, **inlined into the client bundle at build time**                                                          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes      | Publishable key, same build-time inlining                                                                               |
| `VITE_SUPABASE_PROJECT_ID`      | —        | Supabase project ref. Carried through `.env`/`Dockerfile` but read by no code today — keep it in sync, don't rely on it |

> \* `DATABASE_URL` is server-side only. Without it the app still runs but skips DB setup.
> Without `OPENWEATHER_API_KEY` the weather card is unavailable; without `ADMIN_EMAILS` nobody can edit the affiliate catalog (fail-closed).
