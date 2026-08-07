import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyStoreItems } from "@/lib/store-items.functions";
import { useAuth } from "@/hooks/use-auth";
import type { AffiliateProduct } from "@/lib/wardrobe";

export const STORE_ITEMS_QUERY_KEY = ["store-items"];

// Read-only wrapper this loop (B13a) — mutations arrive in B13b alongside the
// ownership policy. Modeled on use-store.ts; same trap, same fix.
export function useStoreItems() {
  const { session } = useAuth();

  const fetchFn = useServerFn(getMyStoreItems);

  const { data, isLoading, isError } = useQuery({
    // key scoped to the user so account switch can't serve a stale list
    queryKey: [...STORE_ITEMS_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
  });

  return {
    items: data ?? [],
    // `!session ||` is load-bearing: TanStack v5 computes
    // `isLoading = isPending && isFetching`, so a query disabled via
    // `enabled: !!session` reports isLoading===false with data===undefined.
    // AuthGate renders children during SSR and the client auth-loading window,
    // so without this every consumer sees `items === [], isLoading === false`
    // and takes the empty-list branch on a cold load — B12b-L2/L3's trap,
    // reproduced here so /store/items doesn't reintroduce it.
    isLoading: !session || isLoading,
    // Surfaced separately so consumers can tell "you have no items" from "the
    // fetch failed" — same reasoning as useStore's isError (B12b-L3).
    isError,
  } satisfies { items: AffiliateProduct[]; isLoading: boolean; isError: boolean };
}
