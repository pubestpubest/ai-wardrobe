import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { AffiliateProduct, WardrobeItem } from "./wardrobe";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
}

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
    store: row.store,
    platform: row.platform,
    emoji: row.emoji,
    imageUrl: row.image_url ?? undefined,
    description: row.description ?? undefined,
    affiliateUrl: row.affiliate_url,
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
