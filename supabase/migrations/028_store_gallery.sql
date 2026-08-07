-- Store gallery: shopfront / interior photos a shop curates, distinct from its
-- product images. Rendered on /store/$id.
--
-- Three layers, as this feature has learned repeatedly (B12a-L2, B13b, B14a,
-- B15, B16): zod bounds the server-function path, the column GRANT bounds which
-- columns, and only a CHECK bounds the VALUES. A store owner holds an UPDATE
-- grant, so they can PATCH this column directly through PostgREST without ever
-- touching updateStore's zod — these URLs render as <img src> for every viewer.

alter table public.stores
  add column if not exists gallery_urls text[] not null default '{}';

-- A CHECK cannot contain a subquery, so the per-element test lives in an
-- IMMUTABLE function. Returns true for an empty array (coalesce), so the
-- default satisfies the constraint.
create or replace function public.all_http_urls(urls text[])
returns boolean
language sql
immutable
as $$
  select coalesce(bool_and(u ~* '^https?://'), true) from unnest(urls) u;
$$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stores_gallery_http_only') then
    alter table public.stores add constraint stores_gallery_http_only
      check (public.all_http_urls(gallery_urls));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stores_gallery_max') then
    alter table public.stores add constraint stores_gallery_max
      check (array_length(gallery_urls, 1) is null or array_length(gallery_urls, 1) <= 8);
  end if;
end $$;

-- Every new column on `stores` needs its OWN column-level grant — 018's header
-- says so explicitly. `022` granted UPDATE on a fixed column list, so without
-- this an owner editing their gallery gets "permission denied for table stores",
-- and the tempting one-line fix (`grant update on public.stores to
-- authenticated`) silently restores the package/status escalation B11-L2 closed.
grant update (gallery_urls) on public.stores to authenticated;
