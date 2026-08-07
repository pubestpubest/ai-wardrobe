// Creates the shared read-only guest account and stocks its wardrobe.
//
// Run manually: SEED_GUEST=1 bun run seed:guest
// Refuses otherwise, same guard as seed-stores.ts — this account's password is
// written down in the repo, so it must never be created by accident in an
// environment that serves real users.
//
// Idempotent: an existing account is reused, and the wardrobe is reseeded only
// when empty, so re-running never duplicates items.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const GUEST_EMAIL = "guest@demo.test";
const GUEST_PIN = "000000";
const WARDROBE_SIZE = 12;

async function main() {
  if (process.env.SEED_GUEST !== "1") {
    console.error("[seed-guest] refusing to run — set SEED_GUEST=1 to confirm");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[seed-guest] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    process.exit(1);
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Reuse an existing account rather than failing on the duplicate email.
  let userId: string | null = null;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email === GUEST_EMAIL);
    if (hit) {
      userId = hit.id;
      break;
    }
    if (data.nextPage == null) break;
  }
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: GUEST_EMAIL,
      password: GUEST_PIN,
      email_confirm: true, // .test is unroutable; no mail can arrive
    });
    if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
    userId = data.user.id;
  }

  // The profile must be COMPLETE (name + birthdate + gender) or ProfileGate
  // blocks the guest at onboarding — and 029 forbids them saving it, which
  // would be an inescapable dead end.
  const { error: pErr } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      role: "guest",
      name: "ผู้เยี่ยมชม",
      gender: "other",
      birthdate: "2000-01-01",
    },
    { onConflict: "user_id" },
  );
  if (pErr) throw new Error(`profiles upsert: ${pErr.message}`);

  // Stock the wardrobe from the admin-curated catalog so the demo isn't empty.
  // Only when empty: re-running must not pile up duplicates.
  const { count, error: cErr } = await admin
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (cErr) throw new Error(`items count: ${cErr.message}`);

  if ((count ?? 0) === 0) {
    const { data: catalog, error: catErr } = await admin
      .from("affiliate_products")
      .select("name, category, color, style, formality, emoji, image_url");
    if (catErr) throw new Error(`catalog: ${catErr.message}`);

    const pool = [...(catalog ?? [])];
    // Fisher-Yates, so the demo wardrobe isn't just the first N rows.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picked = pool.slice(0, WARDROBE_SIZE).map((p: any) => ({
      user_id: userId,
      name: p.name,
      category: p.category,
      color: p.color ?? "",
      style: p.style ?? [],
      formality: p.formality,
      emoji: p.emoji,
      image_url: p.image_url ?? null,
    }));
    const { error: insErr } = await admin.from("items").insert(picked);
    if (insErr) throw new Error(`items insert: ${insErr.message}`);
    console.log(`[seed-guest] stocked ${picked.length} items`);
  } else {
    console.log(`[seed-guest] wardrobe already has ${count} items — left alone`);
  }

  console.log(`[seed-guest] ${GUEST_EMAIL} ready (${userId})`);
}

await main();
