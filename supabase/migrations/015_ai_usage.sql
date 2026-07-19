-- Per-user daily AI-call quota: meter matchChat ("chat") and analyzeClothing
-- ("analyze") calls so cost stays bounded. Limits live in app code (ai-quota.ts),
-- not here — this just gives an atomic, race-safe counter.
create table if not exists public.ai_usage (
  user_id    uuid references auth.users,
  usage_date date not null default current_date,
  kind       text not null,
  count      int  not null default 0,
  primary key (user_id, usage_date, kind)
);
alter table public.ai_usage enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'ai_usage' and policyname = 'Users manage own ai usage'
  ) then
    create policy "Users manage own ai usage" on public.ai_usage for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- Atomic reserve-a-slot: insert or bump the day's counter and return the new
-- count in one statement, so concurrent requests can't race past the cap.
create or replace function public.bump_ai_usage(p_kind text)
returns int
language sql
security invoker
as $$
  insert into public.ai_usage (user_id, usage_date, kind, count)
  values (auth.uid(), current_date, p_kind, 1)
  on conflict (user_id, usage_date, kind)
  do update set count = ai_usage.count + 1
  returning count;
$$;
grant execute on function public.bump_ai_usage(text) to authenticated;
