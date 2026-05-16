-- Wardrobe items
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  category    text not null,
  color       text not null,
  style       text[] not null default '{}',
  formality   text not null,
  emoji       text,
  image_url   text,
  wear_count  int not null default 0,
  last_worn   date,
  created_at  timestamptz not null default now()
);

-- Outfit history
create table if not exists public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  item_ids    uuid[] not null,
  occasion    text,
  weather     text,
  worn_date   date not null default current_date,
  feedback    text check (feedback in ('liked', 'disliked')),
  created_at  timestamptz not null default now()
);

-- Row-Level Security
alter table public.items   enable row level security;
alter table public.outfits enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'items' and policyname = 'Users see own items'
  ) then
    create policy "Users see own items" on public.items for all using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'outfits' and policyname = 'Users see own outfits'
  ) then
    create policy "Users see own outfits" on public.outfits for all using (auth.uid() = user_id);
  end if;
end $$;
