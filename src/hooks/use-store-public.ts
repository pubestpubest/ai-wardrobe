import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStorePublic } from "@/lib/store.functions";
import { useAuth } from "@/hooks/use-auth";
import type { Store } from "@/hooks/use-store";
import type { AffiliateProduct } from "@/lib/wardrobe";

// A store's public profile plus its catalog — what /store/$id renders for
// any signed-in user (LOCAL-STORE.md §2), not just the owner. Store's
// `itemCount` stays unpopulated here (getMyStore's field, not this path's).
export type StorePublic = Store & { items: AffiliateProduct[] };

export const STORE_PUBLIC_QUERY_KEY = ["store-public"];

// Wraps getStorePublic. Modeled on use-store.ts / use-store-items.ts: same
// disabled-query trap (B12b-L2/L3), same fix.
export function useStorePublic(id: string) {
  const { session } = useAuth();

  const fetchFn = useServerFn(getStorePublic);

  const { data, isLoading, isError } = useQuery({
    // key scoped by BOTH the store id (distinct stores must not share a cache
    // entry) and the user id (account switch can't serve a stale read)
    queryKey: [...STORE_PUBLIC_QUERY_KEY, id, session?.user?.id],
    queryFn: () => fetchFn({ data: { id } }),
    enabled: !!session,
  });

  return {
    store: data ?? null,
    // `!session ||` is load-bearing: TanStack v5 computes
    // `isLoading = isPending && isFetching`, so a query disabled via
    // `enabled: !!session` reports isLoading===false with data===undefined.
    // AuthGate renders children during SSR and the client auth-loading
    // window, so without this a cold load of /store/$id would take the
    // not-found branch instead of showing a spinner (B12b-L2's trap).
    isLoading: !session || isLoading,
    // Surfaced separately so consumers can tell "this store doesn't exist /
    // is hidden by RLS" from "the fetch failed" (B12b-L3).
    isError,
  };
}
