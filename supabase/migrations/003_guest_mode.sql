-- Make user_id optional until auth is added
alter table public.items alter column user_id drop not null;

-- Add session_id for anonymous/guest tracking
alter table public.items add column if not exists session_id text;
create index if not exists items_session_id_idx on public.items (session_id);

-- Add wear tracking columns
alter table public.items add column if not exists wear_count int not null default 0;
alter table public.items add column if not exists last_worn date;

-- Relax items RLS for guest mode (all ops allowed)
drop policy if exists "Users see own items" on public.items;
create policy "Guest mode — open" on public.items for all using (true) with check (true);

-- Same for outfits
alter table public.outfits alter column user_id drop not null;
drop policy if exists "Users see own outfits" on public.outfits;
create policy "Guest mode — open" on public.outfits for all using (true) with check (true);
