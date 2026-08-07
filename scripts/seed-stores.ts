// Manual dev-fixture seeder for B11's six local-store logins.
// 018_local_store.sql creates the `stores` rows with owner_user_id = null;
// this script attaches a real login to each so the owner dashboard is
// demoable on day one instead of only after someone registers by hand.
// See LOCAL-STORE.md "Seed accounts" for why this is a script and not SQL.
//
// Run manually: SEED_STORES=1 bun run seed:stores
// Refuses outside SEED_STORES=1 so these published PINs can never reach prod.
// Idempotent: an existing email is skipped (not recreated), but its profile
// role and store ownership are still (re)applied.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// .test is an RFC 2606 reserved TLD — unroutable, so no mail can ever be
// sent here, which is why email_confirm: true is safe.
const SEED_PIN = "246810";

// Fixed literal ids — must match 018_local_store.sql / 019_store_rls_hardening.sql.
// `stores.name` is not unique (from B12 a real shop can register under a
// seeded name), so matching on id is the only safe way to target the seed row.
const STORES: { id: string; name: string; email: string }[] = [
  {
    id: "2a7cdf7a-d498-4a2c-9d88-ad2084212f5c",
    name: "ร้านป้าหมวย สยาม",
    email: "paamuay@store.test",
  },
  {
    id: "2f382f2e-1c2d-407e-b0c5-cd04c6f5a89a",
    name: "Chic Corner ทองหล่อ",
    email: "chiccorner@store.test",
  },
  {
    id: "ef2201ae-9b88-4b4e-8a6a-9cebfb1d8902",
    name: "ห้องเสื้อ พี่สม อารีย์",
    email: "pheesom@store.test",
  },
  {
    id: "9f125aad-1a05-4f85-8ce4-a5e457437fa9",
    name: "ตู้เสื้อผ้าน้องเมย์",
    email: "nongmay@store.test",
  },
  {
    id: "827b02ef-98c9-41de-a586-98da1538ce0d",
    name: "Lila Vintage เอกมัย",
    email: "lilavintage@store.test",
  },
  {
    id: "acd4a8aa-2a91-40c9-bfc6-2cf8ec3c4f6a",
    name: "ร้านลุงชาติ จตุจักร",
    email: "lungchat@store.test",
  },
];

// Lists every user once, keyed by email. Was previously called once per
// store (6× the same full-table scan) — hoisted out of the loop below.
async function listAllUsersByEmail(
  admin: ReturnType<typeof createClient>,
): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email, u.id);
    }
    if (data.nextPage == null) return byEmail;
  }
}

async function main() {
  if (process.env.SEED_STORES !== "1") {
    console.error("[seed-stores] refusing to run — set SEED_STORES=1 to confirm");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[seed-stores] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const usersByEmail = await listAllUsersByEmail(admin);

  for (const s of STORES) {
    let userId = usersByEmail.get(s.email);

    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: s.email,
        password: SEED_PIN,
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`createUser ${s.email}: ${error?.message}`);
      userId = data.user.id;
    }

    const { error: profileErr } = await admin
      .from("profiles")
      .upsert({ user_id: userId, role: "store", name: s.name });
    if (profileErr) throw new Error(`profiles upsert ${s.email}: ${profileErr.message}`);

    // .select() matters: without it PostgREST returns {data:null,error:null} for
    // zero matched rows, so a missing store (018 never ran, ids drifted) would
    // print success and exit 0 — the exact silent failure 019 exists to prevent.
    const { data: updated, error: storeErr } = await admin
      .from("stores")
      .update({ owner_user_id: userId })
      .eq("id", s.id)
      .select("id");
    if (storeErr) throw new Error(`stores update ${s.name}: ${storeErr.message}`);
    if (!updated?.length) {
      throw new Error(`stores update ${s.name}: no store with id ${s.id} — run migrations first`);
    }

    console.log(`[seed-stores] ${s.name} <- ${s.email} (${userId})`);
  }

  console.log("[seed-stores] done");
}

await main();
