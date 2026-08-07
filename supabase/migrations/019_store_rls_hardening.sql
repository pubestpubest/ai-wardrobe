-- Converges the dev DB, which already ran the pre-fix 018 (tracked in
-- public._migrations, so editing 018 in place does not re-run it there).
-- Same fix, corrected 018, and B11-L2.md for the full vulnerability writeup.
-- Idempotent: `drop policy if exists` handles the re-run case, and `revoke`
-- is naturally idempotent — both are harmless on a fresh DB that already
-- got these three statements from the corrected 018.

-- Dev's original 018 created this policy; corrected 018 never will. It let
-- any store owner INSERT unvalidated affiliate_products rows (no zod, no
-- httpUrl refinement, no item cap) rendered for every user — stored XSS.
-- Returns in B13 alongside the validation that makes it safe.
drop policy if exists "Owners manage own store items" on public.affiliate_products;

-- "Owners manage own store" constrains ownership only — nothing stops a
-- self-upgrade to package='premium' or flipping status back to 'approved'.
-- The column-level revoke this migration originally shipped with was a
-- silent no-op: Postgres cannot subtract a column privilege from a
-- table-level GRANT, and Supabase grants table-wide INSERT/UPDATE/DELETE to
-- anon and authenticated by default — confirmed live against dev via
-- information_schema.table_privileges after applying the first cut of this
-- file. Statements below are byte-identical to the corrected 018 — see there
-- for the full column-list rationale (package/status/id/created_at excluded,
-- owner_user_id insert-only, DELETE revoked outright per LOCAL-STORE.md §7).
revoke insert, update, delete on public.stores from anon, authenticated;
-- No grants back — see corrected 018 for why (B11 has no user-scoped writer;
-- a bare GRANT bypasses zod via PostgREST). B12 grants what it needs.

-- Converge the read policy to `to authenticated`; the original shipped as
-- `public`, letting anon read every shop's contacts with the browser key.
drop policy if exists "Public read approved stores" on public.stores;
create policy "Public read approved stores" on public.stores for select
  to authenticated
  using (status = 'approved' or owner_user_id = auth.uid());

-- Same fix, same reason, for profiles.role — see 018 for the verified
-- upsertProfile column list.
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

-- Reconcile store ids. Dev's original 018 used gen_random_uuid(); corrected 018
-- uses fixed literals, and scripts/seed-stores.ts now matches on id — so on dev
-- that lookup would hit nothing and silently skip attaching owners. The FK was
-- NO ACTION on update (confupdtype 'a'), which blocks rewriting stores.id, so
-- swap it to ON UPDATE CASCADE first and let affiliate_products.store_id follow.
-- ON DELETE CASCADE is preserved unchanged. On a fresh DB the id updates are
-- no-ops (ids already match); the FK swap is redundant there only because
-- corrected 018 now declares `on update cascade` itself.
alter table public.affiliate_products
  drop constraint if exists affiliate_products_store_id_fkey;
alter table public.affiliate_products
  add constraint affiliate_products_store_id_fkey
    foreign key (store_id) references public.stores (id)
    on delete cascade on update cascade;

update public.stores set id = '2a7cdf7a-d498-4a2c-9d88-ad2084212f5c' where name = 'ร้านป้าหมวย สยาม'       and id <> '2a7cdf7a-d498-4a2c-9d88-ad2084212f5c'
  and not exists (select 1 from public.stores x where x.id = '2a7cdf7a-d498-4a2c-9d88-ad2084212f5c');
update public.stores set id = '2f382f2e-1c2d-407e-b0c5-cd04c6f5a89a' where name = 'Chic Corner ทองหล่อ'    and id <> '2f382f2e-1c2d-407e-b0c5-cd04c6f5a89a'
  and not exists (select 1 from public.stores x where x.id = '2f382f2e-1c2d-407e-b0c5-cd04c6f5a89a');
update public.stores set id = 'ef2201ae-9b88-4b4e-8a6a-9cebfb1d8902' where name = 'ห้องเสื้อ พี่สม อารีย์' and id <> 'ef2201ae-9b88-4b4e-8a6a-9cebfb1d8902'
  and not exists (select 1 from public.stores x where x.id = 'ef2201ae-9b88-4b4e-8a6a-9cebfb1d8902');
update public.stores set id = '9f125aad-1a05-4f85-8ce4-a5e457437fa9' where name = 'ตู้เสื้อผ้าน้องเมย์'    and id <> '9f125aad-1a05-4f85-8ce4-a5e457437fa9'
  and not exists (select 1 from public.stores x where x.id = '9f125aad-1a05-4f85-8ce4-a5e457437fa9');
update public.stores set id = '827b02ef-98c9-41de-a586-98da1538ce0d' where name = 'Lila Vintage เอกมัย'    and id <> '827b02ef-98c9-41de-a586-98da1538ce0d'
  and not exists (select 1 from public.stores x where x.id = '827b02ef-98c9-41de-a586-98da1538ce0d');
update public.stores set id = 'acd4a8aa-2a91-40c9-bfc6-2cf8ec3c4f6a' where name = 'ร้านลุงชาติ จตุจักร'    and id <> 'acd4a8aa-2a91-40c9-bfc6-2cf8ec3c4f6a'
  and not exists (select 1 from public.stores x where x.id = 'acd4a8aa-2a91-40c9-bfc6-2cf8ec3c4f6a');

-- Same catch-all as corrected 018 (see there for the rn 51+ rationale) —
-- redundant on a fresh DB where 018 already ran it, but the safety net
-- dev's original 018 run never had. After the id rewrite above, this literal
-- is the premium seed store on every environment.
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
