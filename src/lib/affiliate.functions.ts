import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  STORE_PACKAGES,
  weightedPickByGroup,
  type AffiliateProduct,
  type StorePackage,
  type WardrobeItem,
} from "./wardrobe";

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
// Exported (B16) so store.functions.ts's setStorePackage/setStoreStatus reuse
// this exact allowlist check instead of duplicating it — two copies of an
// authorization check are how one gets forgotten during a change.
export function assertAdmin(context: { claims?: { email?: string } }): void {
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

// findAffiliateProduct uses adminClient() (service-role), which bypasses RLS
// entirely — the "Public read approved stores" policy (018/019) does nothing
// here. Suspended stores and store_id-null rows must therefore be excluded
// as an EXPLICIT filter in the query itself (LOCAL-STORE.md §4), not by
// filtering in JS after the fact.
//
// Primary path: embed `stores` with `!inner`, which both (a) turns the
// left-join into an inner join so a null store_id drops the row, and (b)
// lets `.eq("stores.status", ...)` filter on the joined table rather than
// just the nested object. Falls back to a second query (never N+1 — one
// query for the distinct store ids referenced) if this PostgREST instance's
// embed syntax doesn't resolve.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchApprovedCandidateRows(category: WardrobeItem["category"]): Promise<any[]> {
  const admin = adminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primary = await (admin.from("affiliate_products" as any) as any)
    .select("*, stores!inner(package, status)")
    .eq("category", category)
    .eq("stores.status", "approved");

  // Fail loud. The FK `affiliate_products_store_id_fkey` has existed since 019,
  // so PostgREST always resolves this embed — a fallback path here would be
  // unreachable, and the one that shipped first turned every real failure
  // (timeout, pooler exhaustion, permission) into a console.warn plus a silent
  // retry down a different path.
  if (primary.error) throw new Error(primary.error.message);
  return primary.data ?? [];
}

/**
 * Finds a matching affiliate product for a wardrobe gap. Filtered by exact
 * category and store approval (suspended/storeless rows never enter the
 * pool — see fetchApprovedCandidateRows), scored (a `keyword` — the specific
 * item the stylist has in mind, e.g. "แว่นตา" — dominates so a specific
 * request beats generic color/style/formality hints, critical since a coarse
 * category like "accessory" holds bags, glasses, and belts together).
 *
 * Every row tied for the top score is picked in TWO STEPS (LOCAL-STORE.md
 * §4): group the tied candidates by store, weight the STORE choice by its
 * package (`STORE_PACKAGES[pkg].weight`), then pick uniformly among that
 * store's tied items. Not per-item weighting — the two levers would
 * multiply (a premium store can hold ~20x more rows AND be 8x likelier per
 * row, ~160x exposure by accident). Two-step pins the ratio at exactly the
 * package weight regardless of catalog size.
 *
 * Relevance still gates the pool before any of this runs — package only
 * enters at the tie-break, so a single strong signal (a keyword hit, or any
 * hint no one else shares) still wins outright; a premium store can never
 * buy past a genuinely better match. Returns null if no approved-store
 * product matches the category at all.
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
  const rows = await fetchApprovedCandidateRows(category);
  if (rows.length === 0) return null;

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

  // Two-step pick — the shared rule in wardrobe.ts, which scripts/check-weighting.ts
  // also drives, so a revert here fails that check.
  const packageByStoreId = new Map(
    candidates.map((row) => [row.store_id as string, row.stores.package as StorePackage]),
  );
  const pick = weightedPickByGroup(
    candidates,
    (row) => row.store_id as string,
    (id) => STORE_PACKAGES[packageByStoreId.get(id)!].weight,
    Math.random,
  );

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
  // Required, not nullable: since B15 the AI pool excludes `store_id is null`
  // and Discover groups by store, so a null-store item is invisible EVERYWHERE
  // while still showing in this editor's own list — an admin would see an item
  // no user can reach, with no signal. B14a made the dropdown optional; B15's
  // filter is what turned that into a silent hole.
  storeId: z.string().uuid("กรุณาเลือกร้านค้า"),
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
        store_id: p.storeId,
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
// Extended for B16's /admin/stores: the dropdown only ever needed
// {id, name}, but the admin store list also needs package/status/owner/item
// count. Kept as one function rather than splitting — both callers are
// admin-only and the extra columns cost nothing extra to select.
export type AdminStoreListItem = {
  id: string;
  name: string;
  package: StorePackage;
  status: "approved" | "suspended";
  ownerUserId: string | null;
  itemCount: number;
};

export const listStoresForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<AdminStoreListItem[]> => {
    assertAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (adminClient().from("stores" as any) as any)
      .select("id, name, package, status, owner_user_id")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    // One `count` request per store rather than pulling every store_id row.
    // The bulk-select version under-reports the moment PostgREST's db-max-rows
    // is set — silently, and an admin uses this number to decide downgrades.
    // Same discipline createStoreItem's comment argues for. Bounded by the
    // store count (6 today), not the catalog size.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storeRows = (rows ?? []) as any[];
    const counts = new Map<string, number>(
      await Promise.all(
        storeRows.map(async (r): Promise<[string, number]> => {
          const { count, error: cErr } =
            await // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (adminClient().from("affiliate_products" as any) as any)
              .select("id", { count: "exact", head: true })
              .eq("store_id", r.id);
          if (cErr) throw new Error(cErr.message);
          return [r.id as string, count ?? 0];
        }),
      ),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return storeRows.map((r: any) => ({
      id: r.id,
      name: r.name ?? "",
      package: r.package,
      status: r.status,
      ownerUserId: r.owner_user_id ?? null,
      itemCount: counts.get(r.id) ?? 0,
    }));
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
