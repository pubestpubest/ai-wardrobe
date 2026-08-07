-- B12a-L2: value constraints on `stores`.
--
-- 020 grants `authenticated` column-level INSERT so createStore can write
-- through the user-scoped client and have RLS enforce ownership. But a column
-- GRANT bounds *which columns* a caller may write, never *what values* — so a
-- direct `POST /rest/v1/stores` with the browser publishable key and a user JWT
-- skips CreateStoreSchema entirely. Reproduced live in B12a-L1: an empty name,
-- `javascript:` in logo_url and google_map_url, a `data:` online_store_url, and
-- no contact channel were all accepted.
--
-- So: zod bounds what goes through the server function, column grants bound
-- which columns, and only these CHECKs bound values. LOCAL-STORE.md §3 names
-- the URL columns as the real XSS boundary (they become <a href>/<img src> for
-- every viewer in B14) — this is where that boundary actually lives.
--
-- The six seeded stores already satisfy all of these.

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stores_urls_http_only') then
    alter table public.stores add constraint stores_urls_http_only check (
      (google_map_url   is null or google_map_url   ~* '^https?://')
      and (online_store_url is null or online_store_url ~* '^https?://')
      and (logo_url        is null or logo_url        ~* '^https?://')
      and (cover_url       is null or cover_url       ~* '^https?://')
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stores_name_not_blank') then
    alter table public.stores add constraint stores_name_not_blank
      check (length(btrim(name)) > 0 and length(name) <= 120);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stores_description_len') then
    alter table public.stores add constraint stores_description_len
      check (description is null or length(description) <= 2000);
  end if;
end $$;

-- Mirrors CreateStoreSchema's refine: a store card a shopper cannot act on is
-- dead weight on Discover (LOCAL-STORE.md §2, "required at registration").
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stores_has_contact') then
    alter table public.stores add constraint stores_has_contact check (
      length(btrim(coalesce(contact_phone, ''))) > 0
      or length(btrim(coalesce(contact_line, ''))) > 0
      or length(btrim(coalesce(address, ''))) > 0
    );
  end if;
end $$;
