import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAffiliateProducts } from "@/lib/affiliate.functions";
import type { AffiliateProduct } from "@/lib/wardrobe";

export const AFFILIATE_PRODUCTS_QUERY_KEY = ["affiliate-products"];

export function useAffiliateProducts() {
  const fetchFn = useServerFn(getAffiliateProducts);

  const { data: affiliateProducts = [], isLoading } = useQuery<AffiliateProduct[]>({
    queryKey: AFFILIATE_PRODUCTS_QUERY_KEY,
    queryFn: () => fetchFn({ data: {} }),
    staleTime: 30_000,
  });

  return { affiliateProducts, isLoading };
}
