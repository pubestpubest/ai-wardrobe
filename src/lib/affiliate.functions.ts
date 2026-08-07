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

export const getAffiliateProducts = createServerFn({ method: "POST" })
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
  name: z.string().min(1),
  category: z.enum(["top", "bottom", "outerwear", "shoes", "dress", "accessory"]),
  color: z.string().optional(),
  style: z.array(z.string()).default([]),
  formality: z.enum(["casual", "smart-casual", "formal"]),
  price: z.number(),
  size: z.string().optional(),
  store: z.string().min(1),
  platform: z.string().min(1),
  emoji: z.string().min(1),
  imageUrl: httpUrl.optional(),
  description: z.string().optional(),
  affiliateUrl: httpUrl,
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient().from("affiliate_products" as any) as any)
      .update(updateData)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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
