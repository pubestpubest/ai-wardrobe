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

  // ── Matches ────────────────────────────────────────────────────────────
  // Built from whatever the wardrobe actually drew, not hard-coded ids: the
  // 12 items are random, so a fixed outfit would reference items this guest
  // may not own. Each match takes one "base" (dress, else bottom) plus shoes
  // plus an optional accessory/outerwear, and is skipped if its base is
  // missing rather than saved half-empty.
  const { data: owned, error: ownErr } = await admin
    .from("items")
    .select("id, name, category")
    .eq("user_id", userId);
  if (ownErr) throw new Error(`items read: ${ownErr.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byCat = (c: string) => (owned ?? []).filter((i: any) => i.category === c);

  const { count: matchCount } = await admin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((matchCount ?? 0) === 0) {
    const dresses = byCat("dress");
    const bottoms = byCat("bottom");
    const shoes = byCat("shoes");
    const extras = [...byCat("accessory"), ...byCat("outerwear")];

    const plans = [
      {
        name: "ลุคเที่ยวสบาย ๆ",
        occasion: "เที่ยว",
        base: dresses[0],
        shoe: shoes[0],
        extra: extras[0],
      },
      {
        name: "ลุคทำงานเรียบง่าย",
        occasion: "ทำงาน",
        base: bottoms[0],
        shoe: shoes[1],
        extra: extras[1],
      },
      {
        name: "ลุคออกเดทตอนเย็น",
        occasion: "ออกเดท",
        base: dresses[1],
        shoe: shoes[2],
        extra: extras[2],
      },
      {
        name: "ลุคลำลองวันหยุด",
        occasion: "ลำลอง",
        base: bottoms[1],
        shoe: shoes[0],
        extra: extras[0],
      },
    ];

    const rows = plans
      .filter((p) => p.base && p.shoe)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        user_id: userId,
        name: p.name,
        occasion: p.occasion,
        item_ids: [p.base.id, p.shoe.id, ...(p.extra ? [p.extra.id] : [])],
        source: "ai",
        reason: `จับคู่${p.base.name}กับ${p.shoe.name}${p.extra ? ` แล้วเติม${p.extra.name}` : ""}ให้ลุคดูจบขึ้น`,
        affiliate_product_ids: [],
      }));

    if (rows.length > 0) {
      const { error: mErr } = await admin.from("matches").insert(rows);
      if (mErr) throw new Error(`matches insert: ${mErr.message}`);
    }
    console.log(`[seed-guest] created ${rows.length} matches`);
  } else {
    console.log(`[seed-guest] already has ${matchCount} matches — left alone`);
  }

  // ── Mock body model (virtual try-on) ───────────────────────────────────
  // Try-on is still mocked repo-wide (PRD §11.3): it serves prepared images
  // from public/ rather than generating. Pointing the guest at one lets the
  // page render its result state instead of the measure wizard.
  const { count: bmCount } = await admin
    .from("body_models")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((bmCount ?? 0) === 0) {
    const { error: bmErr } = await admin.from("body_models").insert({
      user_id: userId,
      height_cm: 165,
      weight_kg: 52,
      gender: "other",
      source_image_url: "/images/model.png",
      avatar_image_url: "/images/model.png",
    });
    if (bmErr) throw new Error(`body_models insert: ${bmErr.message}`);
    console.log("[seed-guest] created mock body model");
  } else {
    console.log("[seed-guest] body model already present — left alone");
  }

  console.log(`[seed-guest] ${GUEST_EMAIL} ready (${userId})`);
}

await main();
