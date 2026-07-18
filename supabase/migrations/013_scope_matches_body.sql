-- Scope matches + body_models to the owning user (closes guest-mode's open RLS);
-- privatize the body-scan bucket (closes public read + the global-latest leak
-- in getBodyModel — signed URLs now stand in for public ones).
alter table public.matches add column if not exists user_id uuid references auth.users;
alter table public.body_models add column if not exists user_id uuid references auth.users;

drop policy if exists "Guest mode — open" on public.matches;
drop policy if exists "Guest mode — open" on public.body_models;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'matches' and policyname = 'Users manage own matches'
  ) then
    create policy "Users manage own matches" on public.matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'body_models' and policyname = 'Users manage own body models'
  ) then
    create policy "Users manage own body models" on public.body_models for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Scan photos + generated avatars are personal — serve via signed URLs only.
update storage.buckets set public = false where id = 'body-model-images';
drop policy if exists "Body model images public read" on storage.objects;
