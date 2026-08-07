import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/affiliate.functions";
import type { Store } from "@/hooks/use-store";
import type { StorePublic } from "@/hooks/use-store-public";
import type { AffiliateProduct, StorePackage } from "@/lib/wardrobe";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ponytail: stores not in generated types.ts (gen types not run here); cast
function storesTable(supabase: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as SupabaseClient).from("stores" as any) as any;
}

// Same story as storesTable — affiliate_products isn't in generated types.ts.
function affiliateProductsTable(supabase: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as SupabaseClient).from("affiliate_products" as any) as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Store {
  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    contactPhone: row.contact_phone ?? "",
    contactLine: row.contact_line ?? "",
    contactEmail: row.contact_email ?? "",
    address: row.address ?? "",
    googleMapUrl: row.google_map_url ?? "",
    onlineStoreUrl: row.online_store_url ?? "",
    logoUrl: row.logo_url ?? "",
    coverUrl: row.cover_url ?? "",
    package: row.package,
    status: row.status,
    createdAt: row.created_at,
  };
}

// ─── Fetch the caller's own store, if any ─────────────────────────────────────

export const getMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<Store | null> => {
    const { data: row, error } = await storesTable(context.supabase)
      .select("*")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    // Item quota for /store/package's `n/maxItems` (LOCAL-STORE.md §4).
    // Counted here so both /store and /store/package share one round trip.
    // "Public read catalog" (006_affiliate.sql, still in force) lets the
    // user-scoped client count any store's products, so this needs no
    // service-role escalation. B13: do NOT reuse this for cap enforcement — if
    // that policy ever narrows (e.g. hiding suspended stores' products) this
    // count silently under-reports instead of erroring, and a quota check that
    // under-reports lets a store exceed its package. Count via service-role.
    const { count, error: countError } = await affiliateProductsTable(context.supabase)
      .select("id", { count: "exact", head: true })
      .eq("store_id", row.id);
    if (countError) throw new Error(countError.message);

    return { ...mapRow(row), itemCount: count ?? 0 };
  });

// Sets profiles.role='store' for the caller. Must be `upsert`, not `update`:
// a brand-new account has no `profiles` row yet (ProfileGate is bypassed on
// `/store/register`, so onboarding's upsertProfile never ran), and
// PostgREST's UPDATE returns {data:null,error:null} for zero matched rows —
// the exact silent-no-op trap B11-L3 fixed in scripts/seed-stores.ts. Upsert
// only ever touches the columns in this payload (see 019's note on
// upsertProfile), so an existing row's other fields are left untouched.
async function setRoleStore(userId: string): Promise<void> {
  const { data, error } = await adminClient()
    .from("profiles")
    .upsert({ user_id: userId, role: "store" }, { onConflict: "user_id" })
    .select("user_id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(`profiles upsert for ${userId}: no row returned`);
}

// ─── Register a store ──────────────────────────────────────────────────────────

// http(s) only, reused from affiliate.functions.ts's exact refinement shape:
// these fields render as <a href>/<img src> on the public store page, and with
// self-registered owners writing them directly (not an admin), this is the
// actual XSS boundary — LOCAL-STORE.md §3.
const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: "ต้องเป็นลิงก์ http(s)" });

// Shared by create AND update — an edit that clears every contact channel
// leaves a store exactly as dead on Discover as one that never had one, and
// B12b's updateStore reuses this shape wholesale (plan item 2).
const StoreFieldsSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contactPhone: z.string().optional(),
  contactLine: z.string().optional(),
  contactEmail: z.string().optional(),
  address: z.string().optional(),
  googleMapUrl: httpUrl.optional(),
  onlineStoreUrl: httpUrl.optional(),
  logoUrl: httpUrl.optional(),
  coverUrl: httpUrl.optional(),
});

// At least one contact channel — LOCAL-STORE.md §2: "one of three" still
// lets a shop withhold a phone number it doesn't want public, but a store
// card nobody can act on is dead weight on Discover.
const hasContact = (d: z.infer<typeof StoreFieldsSchema>) =>
  !!(d.contactPhone || d.contactLine || d.address);
const CONTACT_MESSAGE = "กรุณากรอกช่องทางติดต่ออย่างน้อยหนึ่งอย่าง: เบอร์โทร, LINE หรือที่อยู่";

const CreateStoreSchema = StoreFieldsSchema.refine(hasContact, { message: CONTACT_MESSAGE });
const UpdateStoreSchema = StoreFieldsSchema.refine(hasContact, { message: CONTACT_MESSAGE });

// Full replacement, not a patch: every column is written on every call, so an
// omitted field becomes null. StoreForm does NOT send all ten — it emits
// undefined for empty inputs and JSON drops those keys. It is safe only because
// the edit form seeds its draft from the fully-loaded store, so an omitted field
// means the user genuinely cleared it. Any other caller must send the complete
// field set or it will silently null the columns it left out.
function toRow(data: z.infer<typeof StoreFieldsSchema>) {
  return {
    name: data.name,
    description: data.description || null,
    contact_phone: data.contactPhone || null,
    contact_line: data.contactLine || null,
    contact_email: data.contactEmail || null,
    address: data.address || null,
    google_map_url: data.googleMapUrl || null,
    online_store_url: data.onlineStoreUrl || null,
    logo_url: data.logoUrl || null,
    cover_url: data.coverUrl || null,
  };
}

export const createStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateStoreSchema.parse(d))
  .handler(async ({ data, context }): Promise<Store> => {
    // Idempotent + self-healing (LOCAL-STORE.md §1, B12a-L1 plan): a previous
    // call may have inserted the store row and then failed on the role flip
    // below. On retry, don't insert a second row (stores_owner_uniq would
    // reject it anyway) — just re-assert the role and hand back the existing
    // store.
    // Refuse converting an account that already has a wardrobe. Flipping role
    // would strand those items behind B12b's redirect guard while RLS still
    // says the account owns them — "a deletion wearing a different hat"
    // (LOCAL-STORE.md §2). RLS scopes this count to the caller's own rows.
    // Runs BEFORE the existing-store lookup so it guards the self-healing path
    // too: otherwise a shopper who acquired a store row (partial failure, or a
    // direct PostgREST insert) retries and flips role with the guard skipped.
    const { count, error: itemsError } = await context.supabase
      .from("items")
      .select("id", { count: "exact", head: true });
    if (itemsError) throw new Error(itemsError.message);
    // `count !== 0`, not `count > 0`: a null count (unparseable header) must
    // fail CLOSED — falling open here performs the destructive conversion.
    if (count !== 0) {
      throw new Error("บัญชีนี้ใช้งานเป็นผู้ใช้อยู่ กรุณาสมัครด้วยอีเมลอื่น");
    }

    const { data: existing, error: existingError } = await storesTable(context.supabase)
      .select("*")
      .eq("owner_user_id", context.userId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    if (existing) {
      await setRoleStore(context.userId);
      return mapRow(existing);
    }

    // INSERT goes through the user-scoped client so RLS's
    // `with check (owner_user_id = auth.uid())` applies — 020 grants exactly
    // these columns to `authenticated`.
    const { data: row, error } = await storesTable(context.supabase)
      .insert({ owner_user_id: context.userId, ...toRow(data) })
      .select("*")
      .single();
    if (error) {
      // 23505 = stores_owner_uniq. A double-submit or a second tab races the
      // existing-store lookup above; surface Thai, not a raw constraint string.
      if ((error as { code?: string }).code === "23505") {
        throw new Error("คุณมีร้านค้าอยู่แล้ว");
      }
      throw new Error(error.message);
    }

    // The role flip MUST use the service-role client: 018/019 revoked `role`
    // from `authenticated` entirely, so a write through context.supabase
    // would fail with "permission denied for table profiles".
    await setRoleStore(context.userId);

    return mapRow(row);
  });

// ─── Fetch a store's public profile + catalog (B14a) ───────────────────────
//
// Same shape as store-items.functions.ts's mapRow (AffiliateProduct), copied
// rather than imported: this is a read-only display path and that module is
// the owner-write path — same duplication the codebase already has between
// affiliate.functions.ts and store-items.functions.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItemRow(row: any): AffiliateProduct {
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
    // Needed by AffiliateItemModal's "ดูที่ร้าน" fallback (B14b) — an item
    // opened from Discover carries no other link back to its store page.
    // Redundant but harmless on /store/$id, where every item's storeId
    // already equals the page's own id.
    storeId: row.store_id ?? undefined,
  };
}

const GetStorePublicSchema = z.object({ id: z.string().uuid() });

// `/store/$id` is signed-in only, not public (AuthGate.tsx:49 gates every
// router route, no pathname exemption — LOCAL-STORE.md §2). Reads through
// context.supabase so RLS "Public read approved stores" (018/019) applies —
// that is what hides a suspended store from everyone but its owner, and it
// must NOT be re-implemented as an app-level `status` check here: the policy
// is the single source of truth, and duplicating it risks the two drifting.
// Returns null (not a throw) for BOTH a missing id and a row RLS hides — the
// two are indistinguishable from this handler, and both mean "nothing to
// show", which is exactly what the not-found branch on /store/$id wants.
export const getStorePublic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // safeParse, not parse: a malformed or stale id is semantically NOT FOUND, not
  // "the fetch failed". Throwing here drove the route's error branch, whose
  // "ลองใหม่" button reloads into the identical failure forever (B14a-L1
  // scrutinize).
  .inputValidator((d: unknown) => {
    const r = GetStorePublicSchema.safeParse(d);
    return r.success ? r.data : { id: null };
  })
  .handler(async ({ data, context }): Promise<StorePublic | null> => {
    // safeParse above yields { id: null } for a malformed id — treat as not-found.
    if (!data.id) return null;
    const { data: row, error } = await storesTable(context.supabase)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: itemRows, error: itemsError } = await affiliateProductsTable(context.supabase)
      .select("*")
      .eq("store_id", row.id)
      .order("created_at", { ascending: false });
    if (itemsError) throw new Error(itemsError.message);

    return { ...mapRow(row), items: (itemRows ?? []).map(mapItemRow) };
  });

// ─── Discover feed: approved stores + their items (B14b) ──────────────────
//
// Same signed-in-only reasoning as getStorePublic above: AuthGate.tsx:49
// gates every router route, no pathname exemption. Reads through
// context.supabase so RLS "Public read approved stores" (018/019) excludes a
// suspended store — do NOT re-implement that check in app code, the policy is
// the single source of truth (LOCAL-STORE.md §3).
export type DiscoverStore = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  package: StorePackage;
  // Surfaced on the Discover card so a shopper can size up a shop without
  // opening it. Deliberately only these two — phone and email stay on
  // /store/$id, so a shop's directly-contactable details aren't sprayed
  // across a browse page.
  address: string;
  contactLine: string;
  items: AffiliateProduct[];
};

export const getDiscoverStores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<DiscoverStore[]> => {
    const { data: storeRows, error } = await storesTable(context.supabase)
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    if (!storeRows || storeRows.length === 0) return [];

    // One extra round trip for every store's items, not N+1 — a single
    // `.in(store_id, …)` fetch, bucketed client-side below. Rows with
    // store_id is null (legacy admin items predating B14a's store dropdown)
    // are excluded by the `.in()` filter itself, so they get no card.
    const storeIds = storeRows.map((r: { id: string }) => r.id);
    const { data: itemRows, error: itemsError } = await affiliateProductsTable(context.supabase)
      .select("*")
      .in("store_id", storeIds)
      .order("created_at", { ascending: false });
    if (itemsError) throw new Error(itemsError.message);

    const itemsByStore = new Map<string, AffiliateProduct[]>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (itemRows ?? []) as any[]) {
      const list = itemsByStore.get(row.store_id) ?? [];
      list.push(mapItemRow(row));
      itemsByStore.set(row.store_id, list);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (storeRows as any[]).map((row) => ({
      id: row.id,
      name: row.name ?? "",
      description: row.description ?? "",
      logoUrl: row.logo_url ?? "",
      package: row.package,
      address: row.address ?? "",
      contactLine: row.contact_line ?? "",
      items: itemsByStore.get(row.id) ?? [],
    }));
  });

// ─── Update the caller's own store profile ─────────────────────────────────

export const updateStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateStoreSchema.parse(d))
  .handler(async ({ data, context }): Promise<Store> => {
    // Writes through the user-scoped client so RLS ("Owners manage own
    // store", 018) enforces ownership, PLUS an explicit .eq scope below —
    // safety shouldn't depend on a policy living in another file (same
    // reasoning as clearWear in outfit-wears.functions.ts). 022 grants
    // exactly these columns; owner_user_id/package/status/id/created_at stay
    // ungranted (an owner must never be able to hand off their store or
    // self-upgrade/self-approve), and 021's CHECKs bound the values on this
    // path too, same as on insert — LOCAL-STORE.md §3.
    const { data: row, error } = await storesTable(context.supabase)
      .update(toRow(data))
      .eq("owner_user_id", context.userId)
      .select("*")
      .single();
    if (error) {
      // PGRST116 = .single() got zero rows back — no store row for this
      // owner (e.g. a second tab raced a delete, or this handler was reached
      // without one existing at all). Same reasoning as the 23505 handling
      // in createStore: surface Thai, not a raw PostgREST string.
      if ((error as { code?: string }).code === "PGRST116") {
        throw new Error("ไม่พบร้านค้าของคุณ");
      }
      throw new Error(error.message);
    }
    return mapRow(row);
  });

// ─── Admin: set a store's package / status (B16) ───────────────────────────
//
// Both write through the SERVICE-ROLE client, not context.supabase:
// 018/019/020/022 deliberately never granted `package`/`status` to
// `authenticated` at all (that's what stops a store self-upgrading or
// self-approving — LOCAL-STORE.md §3, B11's escalation). RLS's "Owners
// manage own store" would happily let an owner through on ownership alone, so
// the only thing standing between "any signed-in user" and these two columns
// is assertAdmin, called first in both handlers, same as every other admin
// write in affiliate.functions.ts.

const SetStorePackageSchema = z.object({
  id: z.string().uuid(),
  package: z.enum(["free", "basic", "premium"]),
});

export const setStorePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetStorePackageSchema.parse(d))
  .handler(async ({ data, context }): Promise<Store> => {
    assertAdmin(context);
    // An admin may downgrade a store below its current item count — allowed.
    // 025/026's cap trigger fires only on affiliate_products writes (insert,
    // or update that moves store_id), never on this UPDATE to `stores`, so a
    // downgraded store simply sits over quota and can't add more until back
    // under the new cap. /store/package already renders that as "18 / 10".
    const { data: row, error } = await storesTable(adminClient())
      .update({ package: data.package })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "PGRST116") {
        throw new Error("ไม่พบร้านค้านี้");
      }
      throw new Error(error.message);
    }
    return mapRow(row);
  });

const SetStoreStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "suspended"]),
});

export const setStoreStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetStoreStatusSchema.parse(d))
  .handler(async ({ data, context }): Promise<Store> => {
    assertAdmin(context);
    const { data: row, error } = await storesTable(adminClient())
      .update({ status: data.status })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "PGRST116") {
        throw new Error("ไม่พบร้านค้านี้");
      }
      throw new Error(error.message);
    }
    return mapRow(row);
  });
