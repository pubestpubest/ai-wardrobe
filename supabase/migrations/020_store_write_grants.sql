-- B12a: store.functions.ts's createStore writes through context.supabase (the
-- user-scoped client) so RLS `with check (owner_user_id = auth.uid())`
-- (018/019, "Owners manage own store") applies. 018/019 deliberately left
-- `authenticated` with NO write privilege at all on `stores` — a bare
-- table-wide GRANT is a direct PostgREST path that bypasses this file's zod
-- (including the httpUrl XSS boundary) entirely. This migration grants back
-- exactly the columns createStore needs, column-level only.
--
-- IMPORTANT, and not obvious: a column GRANT bounds *which columns* a caller
-- may write, never *what values*. These columns stay writable by a direct
-- `POST /rest/v1/stores` that never reaches CreateStoreSchema — proven in
-- B12a-L1 (empty name + `javascript:` logo_url accepted). The httpUrl/XSS and
-- shape rules therefore live in 021's CHECK constraints, not here. zod bounds
-- what goes through the server function; grants bound columns; CHECKs bound
-- values. All three are needed.
--
-- `package`, `status`, `id`, `created_at` stay ungranted so their defaults
-- ('free' / 'approved') apply and neither can be set by the registrant —
-- self-upgrading package or self-approving a suspended store is exactly the
-- privilege escalation B11-L1/L2 blocked on.
--
-- UPDATE is deliberately withheld until B12b, which ships the store-profile
-- edit form that actually needs it. Never "fix" a permission-denied here with
-- `grant update on public.stores to authenticated` (table-wide) — see
-- 018/019 and loops/B11-L2.md for why that reopens the hole. Every future
-- column added to `stores` needs its own column-level GRANT.
grant insert (owner_user_id, name, description, contact_phone, contact_line,
              contact_email, address, google_map_url, online_store_url,
              logo_url, cover_url) on public.stores to authenticated;
