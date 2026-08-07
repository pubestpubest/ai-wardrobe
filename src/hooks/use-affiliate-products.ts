import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getAffiliateProducts,
  amIAdmin,
  createAffiliateProduct,
  updateAffiliateProduct,
  deleteAffiliateProduct,
} from "@/lib/affiliate.functions";
import type { AffiliateProduct } from "@/lib/wardrobe";
import { useAuth } from "@/hooks/use-auth";

export const AFFILIATE_PRODUCTS_QUERY_KEY = ["affiliate-products"];

// The admin editor (AffiliateEditModal) still lists marketplace products, so
// unlike AffiliateProduct these three stay required here — mirrors
// AffiliateProductFields in affiliate.functions.ts (two schemas, one table).
export type NewAffiliateProduct = Omit<
  AffiliateProduct,
  "id" | "store" | "platform" | "affiliateUrl"
> & {
  store: string;
  platform: string;
  affiliateUrl: string;
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

  const { data: affiliateProducts = [], isLoading } = useQuery<AffiliateProduct[]>({
    queryKey: AFFILIATE_PRODUCTS_QUERY_KEY,
    queryFn: () => fetchFn({ data: {} }),
    staleTime: 30_000,
  });

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", session?.user?.id],
    queryFn: () => isAdminFn({ data: {} }).then((r) => r.isAdmin),
    enabled: !!session,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: AFFILIATE_PRODUCTS_QUERY_KEY });

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
    create: (product: NewAffiliateProduct) => createMutation.mutateAsync(product),
    update: (id: string, patch: AffiliateProductPatch) => updateMutation.mutateAsync({ id, patch }),
    remove: (id: string) => removeMutation.mutateAsync(id),
  };
}
