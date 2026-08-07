import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getAffiliateProducts,
  amIAdmin,
  createAffiliateProduct,
  updateAffiliateProduct,
  deleteAffiliateProduct,
  listStoresForAdmin,
} from "@/lib/affiliate.functions";
import type { AffiliateProduct } from "@/lib/wardrobe";
import { useAuth } from "@/hooks/use-auth";
import { DISCOVER_STORES_QUERY_KEY } from "@/hooks/use-discover-stores";

export const AFFILIATE_PRODUCTS_QUERY_KEY = ["affiliate-products"];

// The admin editor (AffiliateEditModal) still lists marketplace products, so
// unlike AffiliateProduct these three stay required here — mirrors
// AffiliateProductFields in affiliate.functions.ts (two schemas, one table).
// `storeId` is `string | null`, not optional: the modal always sends it
// explicitly (uuid or null for "— ไม่ระบุร้าน —"), never omits it, so an
// update can never silently leave a stale assignment in place — same
// explicit-value-over-omission reasoning as B13b-L2's toInput fix.
export type NewAffiliateProduct = Omit<
  AffiliateProduct,
  "id" | "store" | "platform" | "affiliateUrl" | "storeId"
> & {
  store: string;
  platform: string;
  affiliateUrl: string;
  storeId: string | null;
};
export type AffiliateProductPatch = Partial<NewAffiliateProduct>;

export function useAffiliateProducts() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getAffiliateProducts);
  const isAdminFn = useServerFn(amIAdmin);
  const createFn = useServerFn(createAffiliateProduct);
  const updateFn = useServerFn(updateAffiliateProduct);
  const removeFn = useServerFn(deleteAffiliateProduct);
  const listStoresFn = useServerFn(listStoresForAdmin);

  const { data: affiliateProducts = [], isLoading } = useQuery<AffiliateProduct[]>({
    // Session in the key + `enabled`: B14a-L2 put requireSupabaseAuth on
    // getAffiliateProducts, and AuthGate renders children during SSR and the
    // client auth window — so an ungated query fired unauthenticated, failed,
    // and (with no session in the key) cached that failure instead of
    // refetching once the session arrived.
    queryKey: [...AFFILIATE_PRODUCTS_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
    staleTime: 30_000,
  });

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", session?.user?.id],
    queryFn: () => isAdminFn({ data: {} }).then((r) => r.isAdmin),
    enabled: !!session,
    staleTime: 30_000,
  });

  // Only fetched once isAdmin resolves true — listStoresForAdmin itself
  // rejects a non-admin caller, so gating on isAdmin here just avoids a
  // pointless round trip for every shopper viewing Discover.
  const { data: storesForAdmin = [] } = useQuery({
    queryKey: ["stores-for-admin", session?.user?.id],
    queryFn: () => listStoresFn({ data: {} }),
    enabled: !!session && isAdmin,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: AFFILIATE_PRODUCTS_QUERY_KEY });
    // Discover renders from getDiscoverStores since B14b, not from this hook's
    // products. Without this an admin edit/delete/create toasts success while
    // the card keeps showing the old row — and it self-heals on refocus, which
    // makes it harder to diagnose, not milder.
    qc.invalidateQueries({ queryKey: DISCOVER_STORES_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: (product: NewAffiliateProduct) => createFn({ data: { product } }),
    onSuccess: () => {
      invalidate();
      toast.success("บันทึกแล้ว");
    },
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${(err as Error).message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AffiliateProductPatch }) =>
      updateFn({ data: { id, patch } }),
    onSuccess: () => {
      invalidate();
      toast.success("บันทึกแล้ว");
    },
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${(err as Error).message}`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("ลบแล้ว");
    },
    onError: (err) => toast.error(`ลบไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    affiliateProducts,
    isLoading,
    isAdmin,
    storesForAdmin,
    create: (product: NewAffiliateProduct) => createMutation.mutateAsync(product),
    update: (id: string, patch: AffiliateProductPatch) => updateMutation.mutateAsync({ id, patch }),
    remove: (id: string) => removeMutation.mutateAsync(id),
  };
}
