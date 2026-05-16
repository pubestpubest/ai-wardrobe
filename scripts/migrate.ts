import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function ensureBucket() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[migrate] SUPABASE_SERVICE_ROLE_KEY not set — skipping bucket");
    return;
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.id === "wardrobe-images")) {
    console.log("[migrate] bucket wardrobe-images already exists");
    return;
  }
  const { error } = await admin.storage.createBucket("wardrobe-images", { public: true });
  if (error) console.error("[migrate] bucket creation failed:", error.message);
  else console.log("[migrate] bucket wardrobe-images created");
}

async function runSqlMigrations() {
  if (!DATABASE_URL) {
    console.warn("[migrate] DATABASE_URL not set — skipping SQL migrations");
    return;
  }
  const sql = postgres(DATABASE_URL, { max: 1, ssl: "require" });
  try {
    await sql`create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())`;
    const dir = join(import.meta.dir, "../supabase/migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const [{ count }] = await sql`select count(*)::int as count from public._migrations where name = ${file}`;
      if (count > 0) {
        console.log(`[migrate] ${file} already applied`);
        continue;
      }
      console.log(`[migrate] running ${file}...`);
      const body = await readFile(join(dir, file), "utf8");
      await sql.unsafe(body);
      await sql`insert into public._migrations (name) values (${file})`;
      console.log(`[migrate] ${file} done`);
    }
  } finally {
    await sql.end();
  }
}

await ensureBucket();
await runSqlMigrations();
console.log("[migrate] all done");
