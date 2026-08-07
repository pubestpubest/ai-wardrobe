-- B13b: store-item CRUD. Policy + column grants + CHECK constraints land in
-- ONE migration, on purpose — 023 already revoked `authenticated`'s
-- table-wide write grants on affiliate_products, so this policy is born onto
-- a table where the only writable columns are the ones granted below, and
-- those columns' values are bound by the CHECKs below. Same three-layer shape
-- as `stores` (018/020/021/022, LOCAL-STORE.md §3, B12a-L2): zod bounds what
-- goes through the server function, grants bound columns, CHECKs bound
-- values. FOR ALL with matching using/with check, not three per-command
-- policies (LOCAL-STORE.md §3's original shape).

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'affiliate_products' and policyname = 'Owners manage own store items'
  ) then
    create policy "Owners manage own store items" on public.affiliate_products
      for all
      using (exists (select 1 from public.stores s
                     where s.id = affiliate_products.store_id
                       and s.owner_user_id = auth.uid()))
      with check (exists (select 1 from public.stores s
                          where s.id = affiliate_products.store_id
                            and s.owner_user_id = auth.uid()));
  end if;
end $$;

-- store_id is INSERT-only, never in the UPDATE grant: items don't move
-- between stores, and if it were grantable on UPDATE, RLS alone would permit
-- moving an item to ANOTHER store the same caller also owns (the policy only
-- checks that whichever store_id ends up on the row belongs to auth.uid()) —
-- LOCAL-STORE.md §3 / B13b-L1 plan item 1.
--
-- `store` and `platform` stay ungranted on both INSERT and UPDATE: they
-- describe a MARKETPLACE listing (018_local_store.sql's comment) and B10's
-- admin editor is the only writer that still needs them. A store owner has no
-- "platform" and granting these would let a local listing carry fake
-- marketplace metadata for no product reason.
--
-- affiliate_url IS granted: unlike store/platform it is the store's own
-- optional product-page link (LOCAL-STORE.md §1 — "the buy button falls back
-- to /store/$id when there is no affiliate_url"), not marketplace metadata,
-- so an owner may legitimately set it.
--
-- DELETE has no column granularity in Postgres, so the policy above is the
-- only thing scoping it.
grant insert (store_id, name, category, color, style, formality, price,
              size, emoji, image_url, description, affiliate_url)
  on public.affiliate_products to authenticated;
grant update (name, category, color, style, formality, price, size, emoji,
              image_url, description, affiliate_url)
  on public.affiliate_products to authenticated;
grant delete on public.affiliate_products to authenticated;

-- CHECKs — the layer a grant cannot provide (B12a-L2): once a caller holds a
-- column grant they can POST/PATCH directly to PostgREST and never reach
-- store-items.functions.ts's zod. The main session verified live, before
-- this migration was written, that all 50 existing rows (all admin-seeded)
-- are in-range for every constraint below, so they apply cleanly.

-- category was free text with 0 CHECKs before this (B13a-L1's scrutinize
-- finding, carried forward here): CATEGORY_LABELS[p.category] renders blank
-- for an out-of-range value. Inert until now because only service-role wrote
-- this column; from this migration a store owner can too.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_products_category_valid') then
    alter table public.affiliate_products add constraint affiliate_products_category_valid
      check (category in ('top', 'bottom', 'outerwear', 'shoes', 'dress', 'accessory'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_products_urls_http_only') then
    alter table public.affiliate_products add constraint affiliate_products_urls_http_only check (
      (image_url     is null or image_url     ~* '^https?://')
      and (affiliate_url is null or affiliate_url ~* '^https?://')
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_products_formality_valid') then
    alter table public.affiliate_products add constraint affiliate_products_formality_valid
      check (formality in ('casual', 'smart-casual', 'formal'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_products_name_not_blank') then
    alter table public.affiliate_products add constraint affiliate_products_name_not_blank
      check (length(btrim(name)) > 0 and length(name) <= 200);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_products_price_nonneg') then
    alter table public.affiliate_products add constraint affiliate_products_price_nonneg
      check (price >= 0);
  end if;
end $$;

-- Not in B13b-L1's original six CHECKs — added on review (advisor pass, not
-- the plan doc). `emoji` is `not null` (006/018) but NOT NULL does not stop
-- ''. It looked guarded but wasn't: a direct PostgREST PATCH {"emoji":""}
-- would pass every other CHECK here and leave a card with no image and no
-- glyph — store-items.functions.ts's `emoji: z.string().min(1)` only guards
-- the server-fn path. Same class of gap `affiliate_products_name_not_blank`
-- closes for `name`. Not verified live (unlike the six above) — inferred from
-- 006_affiliate.sql's INSERT literals, where every seeded row carries a
-- single glyph in the `emoji` column, so it should apply cleanly; the main
-- session should confirm before applying, same as the other six.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_products_emoji_not_blank') then
    alter table public.affiliate_products add constraint affiliate_products_emoji_not_blank
      check (length(btrim(emoji)) > 0 and length(emoji) <= 16);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'affiliate_products_description_len') then
    alter table public.affiliate_products add constraint affiliate_products_description_len
      check (description is null or length(description) <= 2000);
  end if;
end $$;
