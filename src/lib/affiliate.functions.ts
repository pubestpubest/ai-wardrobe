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

/**
 * Finds the best-matching affiliate product for a wardrobe gap, filtered by
 * exact category match and scored by formality / style overlap / color hints.
 * Returns null if no product matches the category at all.
 */
export async function findAffiliateProduct({
  category,
  color,
  style,
  formality,
}: {
  category: WardrobeItem["category"];
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let best: any = null;
  let bestScore = -1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of rows as any[]) {
    let score = 0;
    if (formality && row.formality === formality) score += 3;
    if (color && typeof row.color === "string") {
      if (row.color === color || row.color.includes(color) || color.includes(row.color)) {
        score += 2;
      }
    }
    if (style && style.length > 0 && Array.isArray(row.style)) {
      const overlap = row.style.filter((s: string) => style.includes(s)).length;
      score += overlap;
    }
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  return best ? mapRow(best) : null;
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
