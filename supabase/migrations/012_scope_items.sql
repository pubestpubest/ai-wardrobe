-- Scope items to the owning user (closes guest-mode's open RLS)
drop policy if exists "Guest mode — open" on public.items;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'items' and policyname = 'Users manage own items'
  ) then
    create policy "Users manage own items" on public.items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
