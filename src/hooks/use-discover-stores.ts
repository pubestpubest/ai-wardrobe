import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDiscoverStores, type DiscoverStore } from "@/lib/store.functions";
import { useAuth } from "@/hooks/use-auth";

export const DISCOVER_STORES_QUERY_KEY = ["discover-stores"];

// Wraps getDiscoverStores. Same disabled-query trap as use-store.ts /
// use-store-public.ts (B12b-L2/L3): a query disabled via `enabled: !!session`
// reports isLoading===false with data===undefined, and AuthGate renders
// children during SSR and the client auth-loading window — without the
// `!session ||` guard, Discover would render its empty state on every cold
// load instead of a spinner.
export function useDiscoverStores() {
  const { session } = useAuth();

  const fetchFn = useServerFn(getDiscoverStores);

  const { data, isLoading, isError } = useQuery({
    // key scoped to the user so account switch can't serve a stale read
    queryKey: [...DISCOVER_STORES_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
  });

  return {
    stores: data ?? [],
    // `data === undefined` means "never fetched" — the discriminator the
    // route needs. `stores.length === 0` is NOT a substitute: a genuinely
    // empty catalog (fetched fine, zero rows) and a failed background
    // refetch both leave `stores` as `[]`, and B12b-L3's `isError && !store`
    // pattern (store.$id.tsx) relies on exactly this "no data yet" signal,
    // not "empty data", to avoid the error screen swallowing the legitimate
    // no-stores state.
    hasData: data !== undefined,
    isLoading: !session || isLoading,
    // Surfaced separately so the route can tell "the fetch failed" from
    // "zero approved stores" (B12b-L3).
    isError,
  };
}

export type { DiscoverStore };
