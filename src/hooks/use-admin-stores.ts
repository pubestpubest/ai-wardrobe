import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listStoresForAdmin, type AdminStoreListItem } from "@/lib/affiliate.functions";
import { setStorePackage, setStoreStatus } from "@/lib/store.functions";
import { useAuth } from "@/hooks/use-auth";
import { DISCOVER_STORES_QUERY_KEY } from "@/hooks/use-discover-stores";
import type { StorePackage } from "@/lib/wardrobe";

export type { AdminStoreListItem };

export const ADMIN_STORES_QUERY_KEY = ["admin-stores"];

// B16: /admin/stores. Same disabled-query trap as every other store hook
// (B12b-L2/L3) — `enabled: !!session` reports isLoading===false while the
// query is disabled pre-session, so `!session ||` is load-bearing here too.
export function useAdminStores() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const listFn = useServerFn(listStoresForAdmin);
  const setPackageFn = useServerFn(setStorePackage);
  const setStatusFn = useServerFn(setStoreStatus);

  const { data, isLoading, isError } = useQuery({
    queryKey: [...ADMIN_STORES_QUERY_KEY, session?.user?.id],
    queryFn: () => listFn({ data: {} }),
    enabled: !!session,
    // listStoresForAdmin calls assertAdmin first, so a non-admin's rejection is
    // deterministic — retrying it 3x just makes them stare at กำลังโหลด… for ~7s
    // before the not-authorised state appears.
    retry: false,
  });

  // Suspending/reinstating or repackaging a store changes what Discover shows
  // and what AffiliateEditModal's store dropdown lists — invalidating only
  // this hook's own key would leave both showing the old state until an
  // unrelated refocus refetch (B14b-L2's finding, same shape: "toasts success
  // while the card keeps showing the old row"). "stores-for-admin" is
  // use-affiliate-products.ts's inline query key — no exported constant
  // there, so it's spelled out here too.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ADMIN_STORES_QUERY_KEY });
    qc.invalidateQueries({ queryKey: DISCOVER_STORES_QUERY_KEY });
    qc.invalidateQueries({ queryKey: ["stores-for-admin"] });
  };

  const setPackageMutation = useMutation({
    mutationFn: ({ id, pkg }: { id: string; pkg: StorePackage }) =>
      setPackageFn({ data: { id, package: pkg } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(`เปลี่ยนแพ็กเกจไม่สำเร็จ: ${(err as Error).message}`),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "suspended" }) =>
      setStatusFn({ data: { id, status } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(`เปลี่ยนสถานะไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    stores: data ?? [],
    // `!session ||` — see comment above.
    isLoading: !session || isLoading,
    // Surfaced separately so the route can tell "no stores" from "the fetch
    // failed" — same reasoning as useStore's isError (B12b-L3).
    isError,
    setPackage: (id: string, pkg: StorePackage) => setPackageMutation.mutateAsync({ id, pkg }),
    isSettingPackage: setPackageMutation.isPending,
    setStatus: (id: string, status: "approved" | "suspended") =>
      setStatusMutation.mutateAsync({ id, status }),
    isSettingStatus: setStatusMutation.isPending,
  } satisfies {
    stores: AdminStoreListItem[];
    isLoading: boolean;
    isError: boolean;
    setPackage: (id: string, pkg: StorePackage) => Promise<unknown>;
    isSettingPackage: boolean;
    setStatus: (id: string, status: "approved" | "suspended") => Promise<unknown>;
    isSettingStatus: boolean;
  };
}
