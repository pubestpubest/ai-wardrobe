import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Store } from "@/hooks/use-store";

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
    return row ? mapRow(row) : null;
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

const CreateStoreSchema = z
  .object({
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
  })
  // At least one contact channel — LOCAL-STORE.md §2: "one of three" still
  // lets a shop withhold a phone number it doesn't want public, but a store
  // card nobody can act on is dead weight on Discover.
  .refine((d) => !!(d.contactPhone || d.contactLine || d.address), {
    message: "กรุณากรอกช่องทางติดต่ออย่างน้อยหนึ่งอย่าง: เบอร์โทร, LINE หรือที่อยู่",
  });

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
      .insert({
        owner_user_id: context.userId,
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
      })
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
