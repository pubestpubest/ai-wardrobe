import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AffiliateProduct, WardrobeItem } from "./wardrobe";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Authorization boundary for every affiliate_products write: writes go through
// the service-role client (bypasses RLS), so this check — not a DB policy —
// is what keeps non-admins from mutating the catalog. Empty/unset
// ADMIN_EMAILS means nobody is admin (fail closed).
function assertAdmin(context: { claims?: { email?: string } }): void {
  const allowlist = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  const email = context.claims?.email?.toLowerCase();
  if (!email || !allowlist.has(email)) {
    throw new Error("ต้องเป็นผู้ดูแลระบบ");
  }
}

export const amIAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    try {
      assertAdmin(context);
      return { isAdmin: true };
    } catch {
      return { isAdmin: false };
    }
  });

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
    storeId: row.store_id ?? undefined,
  };
}

// Fuzzy keyword match for a spaceless language (Thai): exact substring either
// direction scores highest, else any shared 4-char window counts as a partial
// hit. Returns 0 when there's no meaningful overlap.
function keywordScore(keyword: string, text: string): number {
  const a = keyword.replace(/\s+/g, "").toLowerCase();
  const b = (text ?? "").replace(/\s+/g, "").toLowerCase();
  if (!a || !b) return 0;
  if (b.includes(a) || a.includes(b)) return 10;
  for (let i = 0; i + 4 <= a.length; i++) {
    if (b.includes(a.slice(i, i + 4))) return 6;
  }
  return 0;
}

/**
 * Finds a matching affiliate product for a wardrobe gap. Filtered by exact
 * category, scored (a `keyword` — the specific item the stylist has in mind,
 * e.g. "แว่นตา" — dominates so a specific request beats generic
 * color/style/formality hints, critical since a coarse category like
 * "accessory" holds bags, glasses, and belts together), then picked at RANDOM
 * among every row tied for the top score — so asking for the same gap
 * repeatedly doesn't always return the identical item, while a single strong
 * signal (a keyword hit, or any hint no one else shares) still wins outright.
 * Returns null if no product matches the category at all.
 */
export async function findAffiliateProduct({
  category,
  keyword,
  color,
  style,
  formality,
}: {
  category: WardrobeItem["category"];
  keyword?: string;
  color?: string;
  style?: string[];
  formality?: WardrobeItem["formality"];
}): Promise<AffiliateProduct | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (adminClient().from("affiliate_products" as any) as any)
    .select("*")
    .eq("category", category);
  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return null;

  const scored = (rows as unknown[]).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    let score = 0;
    if (keyword) {
      // Name match is the strongest signal; description is a weaker fallback.
      score += keywordScore(keyword, r.name) * 2;
      score += keywordScore(keyword, r.description ?? "");
    }
    if (formality && r.formality === formality) score += 3;
    if (color && typeof r.color === "string") {
      if (r.color === color || r.color.includes(color) || color.includes(r.color)) {
        score += 2;
      }
    }
    if (style && style.length > 0 && Array.isArray(r.style)) {
      const overlap = r.style.filter((s: string) => style.includes(s)).length;
      score += overlap;
    }
    return { row: r, score };
  });

  const bestScore = Math.max(...scored.map((s) => s.score));
  const candidates = scored.filter((s) => s.score === bestScore).map((s) => s.row);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];

  return pick ? mapRow(pick) : null;
}

// requireSupabaseAuth added in B14a-L2: this reads through adminClient()
// (service-role, RLS bypassed) with select("*"), and B14a added `storeId` to
// mapRow — so unauthenticated callers were being handed the store→item mapping
// for every store, including ones RLS hides. LOCAL-STORE.md §2 explicitly
// decided the store page is signed-in only; this endpoint was quietly serving
// half of it to anyone. Every caller (useAffiliateProducts) is already gated on
// `!!session`, so nothing legitimate loses access.
export const getAffiliateProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async (): Promise<AffiliateProduct[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (adminClient().from("affiliate_products" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

// http(s) only — these strings render as <a href>/<img src> for every viewer,
// so an admin-entered javascript:/data: scheme would be stored-XSS.
const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: "ต้องเป็นลิงก์ http(s)" });

const AffiliateProductFields = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.enum(["top", "bottom", "outerwear", "shoes", "dress", "accessory"]),
  color: z.string().optional(),
  style: z.array(z.string()).default([]),
  formality: z.enum(["casual", "smart-casual", "formal"]),
  // Mirrors 024's CHECKs, which apply to service_role too — without these an
  // admin gets a raw English constraint string where the write used to succeed.
  price: z.number().finite().min(0),
  size: z.string().optional(),
  store: z.string().min(1),
  platform: z.string().min(1),
  emoji: z.string().trim().min(1).max(16),
  imageUrl: httpUrl.optional(),
  description: z.string().max(2000).optional(),
  affiliateUrl: httpUrl,
  // Which local store this admin-added item belongs to. Optional+nullable:
  // undefined on create means "not sent" (defaults to no store below), and an
  // explicit null on update is how the modal's "— ไม่ระบุร้าน —" option clears
  // a previously-assigned store — the same explicit-null-not-omission
  // reasoning as B13b-L2's toInput fix for the store-owner path.
  storeId: z.string().uuid().optional().nullable(),
});

export const createAffiliateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ product: AffiliateProductFields }).parse(d))
  .handler(async ({ data, context }): Promise<AffiliateProduct> => {
    assertAdmin(context);
    const p = data.product;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (adminClient().from("affiliate_products" as any) as any)
      .insert({
        name: p.name,
        category: p.category,
        color: p.color ?? null,
        style: p.style,
        formality: p.formality,
        price: p.price,
        size: p.size ?? null,
        store: p.store,
        platform: p.platform,
        emoji: p.emoji,
        image_url: p.imageUrl ?? null,
        description: p.description ?? null,
        affiliate_url: p.affiliateUrl,
        // 025's cap trigger exempts `store_id is null` (admin marketplace
        // rows carry no cap) — assigning a store here brings this item under
        // THAT store's package cap, same as if the owner had created it
        // themselves. An admin assigning a store to an already-full store
        // gets 025's Thai error ("ถึงขีดจำกัดของแพ็กเกจแล้ว…") on this insert.
        store_id: p.storeId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(row);
  });

export const updateAffiliateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string(), patch: AffiliateProductFields.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context);
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
    if (p.store !== undefined) updateData.store = p.store;
    if (p.platform !== undefined) updateData.platform = p.platform;
    if (p.emoji !== undefined) updateData.emoji = p.emoji;
    if (p.imageUrl !== undefined) updateData.image_url = p.imageUrl || null;
    if (p.description !== undefined) updateData.description = p.description || null;
    if (p.affiliateUrl !== undefined) updateData.affiliate_url = p.affiliateUrl;
    // `!== undefined`, not truthy: an explicit `null` here (the modal's
    // "— ไม่ระบุร้าน —" option) must reach Postgres as a real clear, not be
    // skipped like an omitted field — same reasoning as every other patch
    // field above.
    // The UPDATE path IS capped: 025's trigger covers INSERT, 026 covers
    // UPDATE with `when (new.store_id is distinct from old.store_id)`. An admin
    // re-pointing an item into a full store gets 025's Thai cap error; an
    // ordinary edit that doesn't move the item isn't re-counted. (B14a-L1's
    // gate found this gap — an UPDATE had moved 18 items into a cap-10 store —
    // and shipped 026 in the same change. Do not re-add a migration for it.)
    if (p.storeId !== undefined) updateData.store_id = p.storeId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient().from("affiliate_products" as any) as any)
      .update(updateData)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Store list for the admin editor's dropdown (B14a) ─────────────────────
//
// Service-role, not context.supabase: RLS's "Public read approved stores"
// (018/019) is `using (status = 'approved' or owner_user_id = auth.uid())` —
// it hides a SUSPENDED store from every caller except its own owner, and the
// admin is neither. An unclaimed seeded store (owner_user_id is null,
// status still 'approved') happens to pass that policy already, but the admin
// path is written to not depend on that: it must see every store, suspended
// or unclaimed, or an admin can never assign an item to one
// (LOCAL-STORE.md §3/§4 — "an admin-added item would carry store_id = null
// forever and be silently invisible").
export const listStoresForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<{ id: string; name: string }[]> => {
    assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (adminClient().from("stores" as any) as any)
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as { id: string; name: string }[];
  });

export const deleteAffiliateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient().from("affiliate_products" as any) as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
