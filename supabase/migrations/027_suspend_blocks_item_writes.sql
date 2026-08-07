-- B16: suspension must block item writes, not just hide the store.
--
-- "Owners manage own store items" (024) filters on s.owner_user_id alone —
-- a suspended owner still holds the INSERT/UPDATE/DELETE column grants from
-- 024, AND still passes this policy on ownership, so an app-level refusal in
-- store-items.functions.ts (added alongside this migration, for the message
-- only) would be bypassable by one direct PostgREST call with the browser
-- publishable key and the owner's own JWT. Same class of gap this feature has
-- now had to close four times (B12a-L2 grants-vs-values, B13b-L1 an
-- unbounded count, B14a-L1 the UPDATE-path cap gap, B15-L1 a service-role
-- path where RLS is inert): whatever holds the grant is the boundary. zod
-- bounds the server-fn path, column GRANTs bound columns, CHECKs bound
-- values, triggers bound counts — and RLS bounds rows, which is what
-- "suspended" actually needs here. Do not simplify this back to an app-level
-- check; store-items.functions.ts is explicit that its own check is for the
-- message, not the enforcement.
--
-- Store-profile edits on `stores` stay allowed on purpose (LOCAL-STORE.md,
-- B16-L1 grill outcome) — a suspended shop must still be able to fix whatever
-- caused the suspension, so the `stores` policies are untouched here.
-- "Public read catalog" (006_affiliate.sql, using (true)) is untouched too —
-- a suspended owner must still SEE their own catalog on /store/items, they
-- just can't change it. Only this one policy's using/with check changes.

drop policy if exists "Owners manage own store items" on public.affiliate_products;

create policy "Owners manage own store items" on public.affiliate_products
  for all
  using (exists (select 1 from public.stores s
                 where s.id = affiliate_products.store_id
                   and s.owner_user_id = auth.uid()
                   and s.status = 'approved'))
  with check (exists (select 1 from public.stores s
                      where s.id = affiliate_products.store_id
                        and s.owner_user_id = auth.uid()
                        and s.status = 'approved'));
