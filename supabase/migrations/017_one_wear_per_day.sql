-- One outfit per day: collapse the wear-log to a single row per (user, date).
-- Dedupe first — the unique index can't be created while duplicates exist.
-- Keep the newest row per day; created_at desc then id desc so ties are stable.
delete from public.outfit_wears w
using (
  select id, row_number() over (
    partition by user_id, worn_date order by created_at desc, id desc
  ) as rn
  from public.outfit_wears
) d
where w.id = d.id and d.rn > 1;

-- Unique INDEX, not ADD CONSTRAINT: the latter has no IF NOT EXISTS in Postgres
-- and this file must stay re-runnable. Doubles as the upsert's conflict target.
create unique index if not exists outfit_wears_user_date_uniq
  on public.outfit_wears (user_id, worn_date);
