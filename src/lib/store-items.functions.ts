import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STORE_PACKAGES, type AffiliateProduct, type StorePackage } from "@/lib/wardrobe";

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

// Service-role client — used ONLY for the package-cap count. See createStoreItem.
function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
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

// ─── Create / update / delete the caller's own store items (B13b) ─────────
//
// http(s) only — same XSS-boundary reasoning as store.functions.ts's httpUrl:
// these render as <a href>/<img src> for every viewer.
const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: "ต้องเป็นลิงก์ http(s)" });

// Mirrors 024_store_items_crud.sql's CHECK constraints so the error surfaces
// before the round trip, not just after it (same shape as StoreForm's
// validateStoreDraft mirroring store.functions.ts's schema).
const StoreItemFieldsSchema = z.object({
  name: z.string().trim().min(1, "กรุณากรอกชื่อไอเท็ม").max(200, "ชื่อยาวเกินไป"),
  category: z.enum(["top", "bottom", "outerwear", "shoes", "dress", "accessory"]),
  color: z.string().optional(),
  style: z.array(z.string()).default([]),
  formality: z.enum(["casual", "smart-casual", "formal"]),
  price: z.number().finite("ราคาไม่ถูกต้อง").min(0, "ราคาต้องไม่ติดลบ"),
  size: z.string().optional(),
  emoji: z.string().trim().min(1, "กรุณาเลือกอีโมจิ").max(16, "อีโมจิยาวเกินไป"),
  imageUrl: httpUrl.or(z.literal("")).optional(),
  description: z.string().max(2000, "คำอธิบายยาวเกินไป").optional(),
  affiliateUrl: httpUrl.or(z.literal("")).optional(),
});

// Resolves the caller's own store id (and package, for the cap check below).
// Every mutation below scopes itself by this id EXPLICITLY, in addition to
// whatever RLS does — same reasoning as clearWear in
// outfit-wears.functions.ts: a handler's safety must not depend solely on a
// policy that lives in a different migration file.
async function resolveOwnStore(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; pkg: StorePackage }> {
  const { data: store, error } = await storesTable(supabase)
    .select("id, package")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!store) throw new Error("ไม่พบร้านค้าของคุณ");
  return { id: store.id, pkg: store.package as StorePackage };
}

export const createStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StoreItemFieldsSchema.parse(d))
  .handler(async ({ data, context }): Promise<AffiliateProduct> => {
    const { id: storeId, pkg } = await resolveOwnStore(context.supabase, context.userId);

    // Counted with the SERVICE-ROLE client, not context.supabase (B12b-L3 /
    // B13b-L1 plan item 3): getMyStore's itemCount reads through "Public read
    // catalog" (using (true)); if that policy is ever narrowed (e.g. to hide
    // suspended stores' products), a user-scoped count here would silently
    // under-report and let a store slip past its package cap.
    const { count, error: countError } = await affiliateProductsTable(adminClient())
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);
    if (countError) throw new Error(countError.message);

    // This app-side check exists for the MESSAGE, not the enforcement: it
    // reports "(10/10) กรุณาติดต่อเพื่ออัปเกรด" before attempting the insert.
    // ENFORCEMENT is migration 025's before-insert trigger — that is what makes
    // the cap real for every writer, direct PostgREST included, and it holds
    // under concurrency (scrutinize raced 6 inserts at 9/10: exactly one won).
    // Counted with the SERVICE-ROLE client because a user-scoped count reads
    // through "Public read catalog" and would silently under-report if that
    // policy ever narrowed (B12b-L3).
    const maxItems = STORE_PACKAGES[pkg].maxItems;
    if ((count ?? 0) >= maxItems) {
      throw new Error(
        `ไอเท็มในร้านเต็มโควตาแล้ว (${count}/${maxItems}) กรุณาติดต่อเพื่ออัปเกรดแพ็กเกจ`,
      );
    }

    // INSERT through the user-scoped client so RLS's "Owners manage own store
    // items" (024) applies too — belt and suspenders with resolveOwnStore's
    // server-resolved storeId above, which the client never supplies (it is
    // not a field in StoreItemFieldsSchema at all, so nothing the caller sends
    // can pick a different store).
    const { data: row, error } = await affiliateProductsTable(context.supabase)
      .insert({
        store_id: storeId,
        name: data.name,
        category: data.category,
        color: data.color || null,
        style: data.style,
        formality: data.formality,
        price: data.price,
        size: data.size || null,
        emoji: data.emoji,
        image_url: data.imageUrl || null,
        description: data.description || null,
        affiliate_url: data.affiliateUrl || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(row);
  });

export const updateStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: StoreItemFieldsSchema.partial() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<AffiliateProduct> => {
    const { id: storeId } = await resolveOwnStore(context.supabase, context.userId);
    const p = data.patch;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (p.name !== undefined) updateData.name = p.name;
    if (p.category !== undefined) updateData.category = p.category;
    if (p.color !== undefined) updateData.color = p.color || null;
    if (p.style !== undefined) updateData.style = p.style;
    if (p.formality !== undefined) updateData.formality = p.formality;
    if (p.price !== undefined) updateData.price = p.price;
    if (p.size !== undefined) updateData.size = p.size || null;
    if (p.emoji !== undefined) updateData.emoji = p.emoji;
    if (p.imageUrl !== undefined) updateData.image_url = p.imageUrl || null;
    if (p.description !== undefined) updateData.description = p.description || null;
    if (p.affiliateUrl !== undefined) updateData.affiliate_url = p.affiliateUrl || null;

    // Scoped by RLS (context.supabase + 024's policy) AND an explicit
    // .eq("store_id", storeId) — never trusts the policy alone, same
    // reasoning as createStoreItem/clearWear above.
    const { data: row, error } = await affiliateProductsTable(context.supabase)
      .update(updateData)
      .eq("id", data.id)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      // PGRST116 = .single() got zero rows — either no such item, or it
      // belongs to a different store. Same reasoning as store.functions.ts's
      // 23505/PGRST116 handling: surface Thai, not a raw PostgREST string.
      if ((error as { code?: string }).code === "PGRST116") {
        throw new Error("ไม่พบไอเท็มนี้ในร้านของคุณ");
      }
      throw new Error(error.message);
    }
    return mapRow(row);
  });

export const deleteStoreItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { id: storeId } = await resolveOwnStore(context.supabase, context.userId);
    const { error, count } = await affiliateProductsTable(context.supabase)
      .delete({ count: "exact" })
      .eq("id", data.id)
      .eq("store_id", storeId);
    if (error) throw new Error(error.message);
    if (!count) throw new Error("ไม่พบไอเท็มนี้ในร้านของคุณ");
    return { ok: true };
  });
