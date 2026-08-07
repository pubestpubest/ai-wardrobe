-- B11: local stores. Shops register, own a catalog slice of affiliate_products,
-- and get an AI-recommendation / Discover-placement weight from `package`.
-- Design: LOCAL-STORE.md §1. RLS gated on STORE-1 (PRD §13) — human go received.
create table if not exists public.stores (
  id                uuid primary key default gen_random_uuid(),
  owner_user_id     uuid references auth.users on delete cascade,  -- null = seeded/unclaimed
  name              text not null,
  description       text,
  contact_phone     text,
  contact_line      text,
  contact_email     text,
  address           text,
  google_map_url    text,   -- http(s) only, enforced in zod
  online_store_url  text,   -- http(s) only, enforced in zod
  logo_url          text,
  cover_url         text,
  package           text not null default 'free'
                      check (package in ('free', 'basic', 'premium')),
  status            text not null default 'approved'
                      check (status in ('approved', 'suspended')),
  created_at        timestamptz not null default now()
);
create unique index if not exists stores_owner_uniq on public.stores (owner_user_id)
  where owner_user_id is not null;   -- one store per account

alter table public.profiles
  add column if not exists role text not null default 'shopper'
    check (role in ('shopper', 'store'));

alter table public.affiliate_products
  add column if not exists store_id uuid references public.stores
    on delete cascade on update cascade;

-- These three describe a MARKETPLACE listing. A shop in จตุจักร has no "platform"
-- and no Shopee deep-link, and they are all NOT NULL today (006_affiliate.sql) —
-- so a store-owner insert cannot satisfy them. emoji stays NOT NULL: the item
-- form defaults it per category.
alter table public.affiliate_products
  alter column store         drop not null,
  alter column platform      drop not null,
  alter column affiliate_url drop not null;

alter table public.stores enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'stores' and policyname = 'Owners manage own store'
  ) then
    create policy "Owners manage own store" on public.stores for all
      using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'stores' and policyname = 'Public read approved stores'
  ) then
    -- `to authenticated`, not the default `public`: `anon` holds SELECT on this
    -- table and the publishable key is inlined into the browser bundle, so the
    -- default would expose every shop's phone/LINE/address unauthenticated.
    -- PRD §12 B14 settled that the store page is signed-in only.
    create policy "Public read approved stores" on public.stores for select
      to authenticated
      using (status = 'approved' or owner_user_id = auth.uid());
  end if;
end $$;

-- "Owners manage own store items" (affiliate_products FOR ALL by owner) was
-- here and got removed: B11-L1's scrutinize pass found it lets any store owner
-- INSERT unvalidated rows (no zod, no httpUrl refinement, no item cap — B13's
-- guards don't exist yet), rendered for every user via getAffiliateProducts'
-- bare select("*") — stored XSS. Nothing in B11/B12 writes affiliate_products
-- through a user-scoped client, so removing it regresses nothing yet. Returns
-- in B13 alongside the validation that makes it safe. See B11-L2.md.

-- "Owners manage own store" (FOR ALL, owner_user_id = auth.uid()) constrains
-- ownership only — it says nothing about package/status, so any authenticated
-- user could self-upgrade to package='premium' or flip status back to
-- 'approved'. Column-level REVOKE alone is a no-op here: Postgres cannot
-- subtract a column privilege from a table-level GRANT, and Supabase grants
-- table-wide INSERT/UPDATE/DELETE/SELECT to anon and authenticated on every
-- public table by default (verified via information_schema.table_privileges —
-- the earlier `revoke insert (package, status), update (package, status)`
-- left both self-upgrade and self-approve exploitable). Fix is
-- B11 grants `authenticated` no WRITE privilege back on stores (SELECT and
-- Supabase's default REFERENCES/TRIGGER/TRUNCATE remain; TRUNCATE bypasses RLS
-- but PostgREST never emits it and no RPC wraps it): no code writes this table
-- through a user-scoped client until B12, and a bare GRANT is a direct PostgREST
-- path that bypasses store.functions.ts and its zod/httpUrl entirely — an owner
-- could write logo_url = 'javascript:alert(1)' with no validation whatsoever.
-- Same reasoning that removed the affiliate_products policy above. B12 grants
-- exactly the columns it needs, next to the validation that makes them safe.
-- WARNING: every future column added to this table needs its OWN column-level
-- GRANT. Never "fix" a permission-denied here with `grant update on
-- public.stores to authenticated` — that silently restores the vulnerability
-- (see loops/B11-L2.md). service_role is untouched throughout.
revoke insert, update, delete on public.stores from anon, authenticated;

-- "A shopper account cannot convert" (LOCAL-STORE.md §2) otherwise lives only
-- in a route handler — a self-flip would strand the user's wardrobe. Same
-- table-level-grant problem as above, so revoke-then-regrant here too — and
-- the table-level INSERT matters as much as UPDATE: without it a user's first
-- profile write could set role='store' outright. Column list verified against
-- 011_profiles.sql and profile.functions.ts's upsertProfile, which writes
-- through the user-scoped `context.supabase` client — every column the app
-- writes is in both lists below; only `role` (and `created_at`) are excluded.
-- `role` is set exclusively by scripts/seed-stores.ts through the
-- service-role client, which this grant does not touch.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, name, handle, email, bio, favorite_style, avatar_url,
              gender, birthdate, height_cm, weight_kg) on public.profiles to authenticated;
-- user_id is in the UPDATE list because PostgREST's upsert emits
-- `on conflict (user_id) do update set user_id = excluded.user_id, ...` — it
-- puts every payload column in the SET list, including the conflict key, so
-- omitting it breaks upsertProfile and ProfileGate onboarding for every user.
-- Safe: the RLS policy's `with check (auth.uid() = user_id)` still forbids
-- reassigning a row to someone else.
grant update (user_id, name, handle, email, bio, favorite_style, avatar_url,
              gender, birthdate, height_cm, weight_kg) on public.profiles to authenticated;

-- Seed 6 fictional Thai local stores across all three package tiers, so
-- Discover demos the real store-card feature on first load. No phone numbers —
-- any plausible Thai number could belong to a real person; address + LINE
-- satisfy the "at least one contact channel" rule instead. Map URLs are
-- generic area searches, not fabricated place IDs. owner_user_id stays null
-- here; scripts/seed-stores.ts attaches real logins.
--
-- Fixed literal ids, not `where not exists (... name = ...)`: `stores.name`
-- isn't unique, and from B12 a real shop can register under a seeded name —
-- a name-keyed upsert would then hit two rows or retarget a real store. Fixed
-- ids also make store ids identical across dev/UAT/prod, which the deterministic
-- product slice below needs to actually be deterministic. Same six ids are
-- used again in 019 (its catch-all) and scripts/seed-stores.ts (matches on id).
insert into public.stores (id, name, description, address, contact_line, google_map_url, online_store_url, package)
select '2a7cdf7a-d498-4a2c-9d88-ad2084212f5c', 'ร้านป้าหมวย สยาม',
       'เสื้อผ้าผู้หญิงหลากสไตล์ อัปเดตของใหม่ทุกสัปดาห์ ราคาเป็นกันเอง',
       'แถวสยามสแควร์ กรุงเทพฯ',
       '@paamuaysiam',
       'https://www.google.com/maps/search/?api=1&query=%E0%B8%AA%E0%B8%A2%E0%B8%B2%E0%B8%A1%E0%B8%AA%E0%B9%81%E0%B8%84%E0%B8%A7%E0%B8%A3%E0%B9%8C%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%AF',
       'https://paamuaysiam.example.com',
       'premium'
on conflict (id) do nothing;

insert into public.stores (id, name, description, address, contact_line, google_map_url, online_store_url, package)
select '2f382f2e-1c2d-407e-b0c5-cd04c6f5a89a', 'Chic Corner ทองหล่อ',
       'เสื้อผ้าแนวมินิมอลและสมาร์ทแคชชวล คัดของเข้าร้านเอง',
       'แถวทองหล่อ กรุงเทพฯ',
       '@chiccornerth',
       'https://www.google.com/maps/search/?api=1&query=%E0%B8%97%E0%B8%AD%E0%B8%87%E0%B8%AB%E0%B8%A5%E0%B9%88%E0%B8%AD%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%AF',
       'https://chiccornerthonglor.example.com',
       'basic'
on conflict (id) do nothing;

insert into public.stores (id, name, description, address, contact_line, google_map_url, package)
select 'ef2201ae-9b88-4b4e-8a6a-9cebfb1d8902', 'ห้องเสื้อ พี่สม อารีย์',
       'ชุดทำงานและชุดออกงานตัดเย็บดี เน้นทรงสวยใส่สบาย',
       'แถวอารีย์ กรุงเทพฯ',
       '@peesomarea',
       'https://www.google.com/maps/search/?api=1&query=%E0%B8%AD%E0%B8%B2%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B9%8C%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%AF',
       'basic'
on conflict (id) do nothing;

insert into public.stores (id, name, description, address, contact_line, google_map_url, package)
select '9f125aad-1a05-4f85-8ce4-a5e457437fa9', 'ตู้เสื้อผ้าน้องเมย์',
       'เสื้อผ้าวัยรุ่นราคาน่ารัก อัปของใหม่เรื่อย ๆ',
       'แถวบางนา กรุงเทพฯ',
       '@nongmaycloset',
       'https://www.google.com/maps/search/?api=1&query=%E0%B8%9A%E0%B8%B2%E0%B8%87%E0%B8%99%E0%B8%B2%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%AF',
       'free'
on conflict (id) do nothing;

insert into public.stores (id, name, description, address, contact_line, google_map_url, online_store_url, package)
select '827b02ef-98c9-41de-a586-98da1538ce0d', 'Lila Vintage เอกมัย',
       'เสื้อผ้าวินเทจมือสองคัดพิเศษ ชิ้นเดียวในร้าน',
       'แถวเอกมัย กรุงเทพฯ',
       '@lilavintageekk',
       'https://www.google.com/maps/search/?api=1&query=%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%A1%E0%B8%B1%E0%B8%A2%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%AF',
       'https://lilavintage.example.com',
       'free'
on conflict (id) do nothing;

insert into public.stores (id, name, description, address, contact_line, google_map_url, package)
select 'acd4a8aa-2a91-40c9-bfc6-2cf8ec3c4f6a', 'ร้านลุงชาติ จตุจักร',
       'ร้านเสื้อผ้ามือสองในตลาดนัดจตุจักร ของดีราคาถูก',
       'ตลาดนัดจตุจักร กรุงเทพฯ',
       '@lungchatjj',
       'https://www.google.com/maps/search/?api=1&query=%E0%B8%95%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%99%E0%B8%B1%E0%B8%94%E0%B8%88%E0%B8%95%E0%B8%B8%E0%B8%88%E0%B8%B1%E0%B8%81%E0%B8%A3%20%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%80%E0%B8%97%E0%B8%9E%E0%B8%AF',
       'free'
on conflict (id) do nothing;

-- Deterministic product→store assignment: row_number() over (category, name),
-- sliced into the fixed, quota-aware counts from LOCAL-STORE.md — NOT
-- order by random(), so dev/UAT/prod land identical. Only touches rows where
-- store_id is still null, so this is safe to re-run against a partial apply.
with store_slices (id, lo, hi) as (
  values
    ('2a7cdf7a-d498-4a2c-9d88-ad2084212f5c'::uuid, 1, 18),
    ('2f382f2e-1c2d-407e-b0c5-cd04c6f5a89a'::uuid, 19, 30),
    ('ef2201ae-9b88-4b4e-8a6a-9cebfb1d8902'::uuid, 31, 39),
    ('9f125aad-1a05-4f85-8ce4-a5e457437fa9'::uuid, 40, 44),
    ('827b02ef-98c9-41de-a586-98da1538ce0d'::uuid, 45, 48),
    ('acd4a8aa-2a91-40c9-bfc6-2cf8ec3c4f6a'::uuid, 49, 50)
),
ranked as (
  select id, row_number() over (order by category, name) as rn
  from public.affiliate_products
  where store_id is null
)
update public.affiliate_products p
set store_id = sl.id
from ranked r
join store_slices sl on r.rn between sl.lo and sl.hi
where p.id = r.id;

-- Catch-all: the slices above cover rn 1..50 (dev's exact seed count at
-- design time), but B10's admin editor has since shipped, so UAT/prod may
-- hold more than 50 affiliate_products rows. Rows 51+ would otherwise keep
-- store_id null forever and silently vanish from Discover and the AI pool
-- under B14/B15. Land them on the premium seed store rather than orphan them.
update public.affiliate_products
set store_id = '2a7cdf7a-d498-4a2c-9d88-ad2084212f5c'
where store_id is null;

-- Defense in depth beyond the policies above:
-- * anon keeps SELECT by Supabase default and nothing in src/ reads `stores`
--   as anon, so revoke it — that makes "the store page is not public"
--   (LOCAL-STORE.md §2, PRD §12 B14) structural rather than resting solely on
--   the read policy's `to authenticated`. The sibling policy on this schema is
--   `Public read catalog … using (true)`, so copying the local pattern is easy.
-- * profiles DELETE was the third door in role's wall: UPDATE and INSERT are
--   column-restricted above, but `delete from profiles where user_id = <self>`
--   succeeded. Inert today; once B12 puts `role` on the Profile type, a store
--   account could delete its profile to shed role='store', escape the store
--   shell and strand its store row with no owner path back. Account deletion is
--   handled by `auth.users on delete cascade`, not by the client.
revoke select on public.stores from anon;
revoke delete on public.profiles from anon, authenticated;
