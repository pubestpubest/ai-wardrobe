-- B14a-L1 gate finding: `025`'s cap trigger is BEFORE INSERT only, so moving
-- rows between stores with UPDATE walked straight past it. Reproduced live:
-- an UPDATE relocating 18 items into a free-tier (cap 10) store was accepted
-- and left it holding 20. Restored immediately after.
--
-- B13b made this unreachable for store owners — `store_id` is absent from their
-- UPDATE column grant (024), so a PATCH touching it is GRANT-denied. B14a is
-- what made it reachable: updateAffiliateProduct now writes `store_id` through
-- the service-role client so the admin editor can assign an item to a store.
--
-- Same enforcement decision as 025, just the other write path. The `when`
-- clause matters: without it every ordinary edit re-counts a row that is
-- already in the count, so a store sitting exactly at its cap could no longer
-- edit its own items.

drop trigger if exists enforce_store_item_cap_update on public.affiliate_products;
create trigger enforce_store_item_cap_update
  before update on public.affiliate_products
  for each row
  when (new.store_id is distinct from old.store_id)
  execute function public.enforce_store_item_cap();
