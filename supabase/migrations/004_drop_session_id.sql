-- Remove session-based guest tracking; all items are now shared universally
alter table public.items drop column if exists session_id;
drop index if exists items_session_id_idx;
