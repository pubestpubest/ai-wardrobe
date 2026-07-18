-- Per-user profile (replaces localStorage profile store)
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users on delete cascade,
  name           text,
  handle         text,
  email          text,
  bio            text,
  favorite_style text,
  avatar_url     text,
  gender         text,
  birthdate      date,
  height_cm      text,
  weight_kg      text,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users manage own profile'
  ) then
    create policy "Users manage own profile" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
