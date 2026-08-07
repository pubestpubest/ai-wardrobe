-- B13b-L1 gate finding: the package cap was bypassable.
--
-- The cap lived only in createStoreItem's count-then-insert, which assumed the
-- server function is the only writer. `024` granted INSERT to `authenticated`,
-- so that stopped being true: one direct PostgREST bulk insert put 17 rows in a
-- free-tier store (cap 10). Reproduced live, then cleaned up.
--
-- This is the same lesson as B12a-L2, one level further out. zod bounds the
-- server-function path. Column GRANTs bound which columns. CHECK constraints
-- bound values. **Nothing bounds a COUNT** — that needs a trigger, because a
-- row-level CHECK cannot see the rest of the table. And the cap is the
-- monetization lever (LOCAL-STORE.md §4), so an advisory cap is no cap.
--
-- ⚠️ The tier limits are duplicated here and in STORE_PACKAGES
-- (src/lib/wardrobe.ts). They must be changed together. The app-side copy still
-- earns its keep: it drives the UI quota and lets createStoreItem fail with a
-- friendly Thai message before the insert is attempted. This trigger is the
-- backstop that makes the limit real for every writer.

create or replace function public.enforce_store_item_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap int;
  current_count int;
begin
  -- No store_id (admin-created marketplace rows) → no cap to apply.
  if new.store_id is null then
    return new;
  end if;

  select case s.package
           when 'premium' then 200
           when 'basic' then 50
           else 10
         end
    into cap
  from public.stores s
  where s.id = new.store_id;

  if cap is null then
    return new; -- store row vanished mid-flight; the FK will reject this anyway
  end if;

  -- Locking the store row serializes concurrent inserts for the same store, so
  -- unlike the app-side count-then-insert this cannot be raced past by a
  -- double-submit.
  perform 1 from public.stores where id = new.store_id for update;

  select count(*) into current_count
  from public.affiliate_products
  where store_id = new.store_id;

  if current_count >= cap then
    raise exception 'ถึงขีดจำกัดของแพ็กเกจแล้ว (สูงสุด % ไอเท็ม)', cap
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists enforce_store_item_cap on public.affiliate_products;
create trigger enforce_store_item_cap
  before insert on public.affiliate_products
  for each row execute function public.enforce_store_item_cap();
