import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BUCKET = "body-model-images";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
}

function mockAvatarPath(matchName: string): string {
  if (matchName.includes("บาส")) return "model-try-bas.png";
  if (matchName.includes("ห้าง")) return "model-try-bus.png";
  return "model.png";
}

const TryOnInput = z.object({
  matchName: z.string(),
});

export const tryOnOutfit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => TryOnInput.parse(d))
  .handler(async ({ data }) => {
    // Mock: real Gemini try-on generation is disabled for now (same image-gen
    // quota block as body-model.functions.ts) — serve a static mock image
    // chosen by outfit name instead.
    await new Promise((r) => setTimeout(r, 1500));

    const filename = mockAvatarPath(data.matchName);
    const bytes = await readFile(path.join(process.cwd(), "public/images", filename));

    const admin = adminClient();
    const objectPath = `${crypto.randomUUID()}.png`;
    const { error } = await admin.storage.from(BUCKET).upload(objectPath, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);

    // Bucket is private (B07c) — hand back a time-limited signed URL, not a public one.
    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, 3600);
    if (signError) throw new Error(`สร้างลิงก์รูปไม่สำเร็จ: ${signError.message}`);

    return { imageUrl: signed.signedUrl };
  });
