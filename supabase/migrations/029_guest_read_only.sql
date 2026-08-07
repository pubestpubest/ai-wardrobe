-- Guest mode: a shared, read-only account for people who want to look around
-- before signing up.
--
-- Enforced HERE, not in the server functions. A guest holds an ordinary
-- Supabase session, so every column grant `authenticated` has applies to them —
-- one direct PostgREST call would write straight past any app-level refusal.
-- That is the same bypass class B12a-L2, B13b, B14a, B15 and B16 each had to
-- close. The in-app modal exists for the MESSAGE; these policies are the
-- enforcement.
--
-- Shape, per table: the existing FOR ALL policy is narrowed to also require
-- `not is_guest()`, and a SELECT-only policy is added back. Permissive policies
-- OR, so a guest still READS its own rows while every INSERT/UPDATE/DELETE is
-- refused. Narrowing the FOR ALL policy alone would have blocked reads too,
-- since FOR ALL covers SELECT.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('shopper', 'store', 'guest'));

-- security definer: the policies below call this while evaluating access to
-- `profiles` itself, so it must not re-enter RLS. stable: one lookup per
-- statement rather than per row.
create or replace function public.is_guest()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = auth.uid() and role = 'guest'
  );
$$;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('items',        'Users manage own items'),
      ('matches',      'Users manage own matches'),
      ('outfit_wears', 'Users manage own outfit wears'),
      ('body_models',  'Users manage own body models'),
      ('ai_usage',     'Users manage own ai usage')
    ) as v(tbl, pol)
  loop
    execute format('drop policy if exists %I on public.%I', t.pol, t.tbl);
    execute format(
      'create policy %I on public.%I for all
         using (auth.uid() = user_id and not public.is_guest())
         with check (auth.uid() = user_id and not public.is_guest())',
      t.pol, t.tbl);
    execute format('drop policy if exists %I on public.%I', t.pol || ' (read)', t.tbl);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t.pol || ' (read)', t.tbl);
  end loop;
end $$;

-- profiles is handled separately: its policy name differs and a guest must keep
-- reading its own row (ProfileGate and StoreGuard both depend on it).
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles for all
  using (auth.uid() = user_id and not public.is_guest())
  with check (auth.uid() = user_id and not public.is_guest());

drop policy if exists "Users manage own profile (read)" on public.profiles;
create policy "Users manage own profile (read)" on public.profiles
  for select using (auth.uid() = user_id);
