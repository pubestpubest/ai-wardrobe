import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AffiliateProduct } from "@/lib/wardrobe";

// Same story as affiliate.functions.ts / store.functions.ts — `stores` and
// `affiliate_products` aren't in generated types.ts; cast through unknown.
function storesTable(supabase: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as SupabaseClient).from("stores" as any) as any;
}
function affiliateProductsTable(supabase: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as SupabaseClient).from("affiliate_products" as any) as any;
}

// Reused verbatim from affiliate.functions.ts's mapRow — LOCAL-STORE.md §1:
// store/platform/affiliateUrl are optional on AffiliateProduct since 018
// dropped their NOT NULLs for local-store rows, and `?? undefined` is the
// established convention for turning a nullable DB column into "absent"
// rather than `null` (React renders both as nothing, but the type must say
// "optional" for B13b's zod schemas to agree with this shape).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AffiliateProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color ?? undefined,
    style: row.style ?? [],
    formality: row.formality,
    price: row.price,
    size: row.size ?? undefined,
    store: row.store ?? undefined,
    platform: row.platform ?? undefined,
    emoji: row.emoji,
    imageUrl: row.image_url ?? undefined,
    description: row.description ?? undefined,
    affiliateUrl: row.affiliate_url ?? undefined,
  };
}

// ─── Fetch the caller's own store's items, read-only ───────────────────────
//
// Read-only this loop (B13a) — create/update/delete ship in B13b together
// with the ownership policy and column grants (023's comment; LOCAL-STORE.md
// §3). This handler only SELECTs, through the user-scoped client, under the
// existing "Public read catalog" policy — no write path is opened here.
export const getMyStoreItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<AffiliateProduct[]> => {
    const { data: store, error: storeError } = await storesTable(context.supabase)
      .select("id")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (storeError) throw new Error(storeError.message);
    // No store yet (partial registration, or a signed-in visitor who never
    // registered) — nothing to list. Not an error; matches getMyStore's
    // `null` shape for the analogous case.
    if (!store) return [];

    const { data: rows, error } = await affiliateProductsTable(context.supabase)
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });
