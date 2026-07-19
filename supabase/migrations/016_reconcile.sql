-- Reconcile 014/015 (edited after they had already applied on the live DB).
alter table public.outfit_wears drop constraint if exists outfit_wears_match_id_fkey;
alter table public.outfit_wears
  add constraint outfit_wears_match_id_fkey
  foreign key (match_id) references public.matches on delete set null;

revoke execute on function public.bump_ai_usage(text) from anon;
