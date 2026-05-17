-- Saved outfit matches (collections of wardrobe items)
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  item_ids    uuid[] not null default '{}',
  occasion    text,
  note        text,
  reason      text,
  source      text not null default 'manual',
  created_at  timestamptz not null default now()
);

create index if not exists matches_created_at_idx on public.matches (created_at desc);

alter table public.matches enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'matches' and policyname = 'Guest mode — open'
  ) then
    create policy "Guest mode — open" on public.matches for all using (true) with check (true);
  end if;
end $$;
