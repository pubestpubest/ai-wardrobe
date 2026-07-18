-- Outfit history calendar: log which saved match was worn on which day.
create table if not exists public.outfit_wears (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users,
  match_id   uuid references public.matches on delete set null,
  worn_date  date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists outfit_wears_user_date_idx on public.outfit_wears (user_id, worn_date);
alter table public.outfit_wears enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'outfit_wears' and policyname = 'Users manage own outfit wears'
  ) then
    create policy "Users manage own outfit wears" on public.outfit_wears for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
