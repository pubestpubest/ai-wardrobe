import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

let ran = false;

async function ensureStorageBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[migrate] SUPABASE_SERVICE_ROLE_KEY not set — skipping bucket setup");
    return;
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  // Check if bucket already exists first
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    console.error("[migrate] storage listBuckets failed:", listErr.message, listErr);
    return;
  }

  if (buckets?.some((b) => b.id === "wardrobe-images")) {
    console.log("[migrate] wardrobe-images bucket already exists");
    return;
  }

  const { error } = await admin.storage.createBucket("wardrobe-images", { public: true });
  if (error) {
    console.error("[migrate] bucket creation failed:", error.message, error);
  } else {
    console.log("[migrate] wardrobe-images bucket created");
  }
}

export async function runMigrations() {
  if (ran) return;
  ran = true;

  // Bucket creation via admin client (independent of DATABASE_URL)
  await ensureStorageBucket();

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL not set — skipping SQL migrations");
    return;
  }

  const sql = postgres(url, { max: 1, ssl: "require" });

  try {
    await sql`
      create table if not exists public._migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const migrationsDir = join(process.cwd(), "supabase/migrations");
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const [{ count }] = await sql`
        select count(*)::int as count from public._migrations where name = ${file}
      `;
      if (count > 0) continue;

      console.log(`[migrate] running ${file}`);
      const body = await readFile(join(migrationsDir, file), "utf8");
      await sql.unsafe(body);
      await sql`insert into public._migrations (name) values (${file})`;
      console.log(`[migrate] ${file} done`);
    }
  } finally {
    await sql.end();
  }
}
