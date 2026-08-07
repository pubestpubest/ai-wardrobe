import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/affiliate.functions";
import { useAuth } from "@/hooks/use-auth";

export const IS_ADMIN_QUERY_KEY = ["is-admin"];

// Split out of useAffiliateProducts in B14b-L2: since B14b, Discover renders
// from getDiscoverStores and only needed that hook for `isAdmin` — but mounting
// it also fired the ungated products query, so every shopper pulled the entire
// catalog (service-role `select("*")`) and threw it away, on top of
// getDiscoverStores shipping the same rows again.
export function useIsAdmin(): boolean {
  const { session } = useAuth();
  const isAdminFn = useServerFn(amIAdmin);
  const { data: isAdmin = false } = useQuery({
    queryKey: [...IS_ADMIN_QUERY_KEY, session?.user?.id],
    queryFn: () => isAdminFn({ data: {} }).then((r) => r.isAdmin),
    enabled: !!session,
    staleTime: 5 * 60_000,
  });
  return isAdmin;
}
