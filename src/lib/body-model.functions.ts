import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "body-model-images";
const MOCK_AVATAR_PATH = path.join(process.cwd(), "public/images/model.png");

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any) {
  return {
    id: row.id,
    heightCm: Number(row.height_cm),
    weightKg: Number(row.weight_kg),
    gender: row.gender ?? "",
    sourceImageUrl: row.source_image_url,
    avatarImageUrl: row.avatar_image_url,
    createdAt: row.created_at,
  };
}

export type BodyModel = ReturnType<typeof mapRow>;

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!match) throw new Error("รูปต้องเป็น JPEG, PNG, GIF หรือ WebP");
  return { mimeType: match[1], data: match[2] };
}

async function uploadImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  mimeType: string,
  bytes: Buffer,
  ext: string,
) {
  const path = `${crypto.randomUUID()}.${ext}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.storage.from(BUCKET) as any).upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);
  return path;
}

// Bucket is private — resolve a stored value (bare path, or a legacy full
// public URL) to a short-lived signed URL. Never throws: a missing file
// shouldn't break the card, it should just render without an image.
async function signedUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  storedValue: string,
): Promise<string> {
  const marker = `${BUCKET}/`;
  const idx = storedValue.indexOf(marker);
  const objectPath = idx >= 0 ? storedValue.slice(idx + marker.length) : storedValue;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.storage.from(BUCKET) as any).createSignedUrl(
    objectPath,
    3600,
  );
  if (error || !data) return "";
  return data.signedUrl as string;
}

export const getBodyModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase.from("body_models" as any) as any)
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const admin = adminClient();
    const model = mapRow(row);
    return {
      ...model,
      sourceImageUrl: await signedUrl(admin, model.sourceImageUrl),
      avatarImageUrl: await signedUrl(admin, model.avatarImageUrl),
    };
  });

const GenderEnum = z.enum(["male", "female", "other", ""]);

const GenerateBodyModelInput = z.object({
  scanImageDataUrl: z.string().startsWith("data:image/").max(8_000_000),
  heightCm: z.number().positive().max(300),
  weightKg: z.number().positive().max(400),
  gender: GenderEnum.optional(),
});

export const generateBodyModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateBodyModelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { mimeType, data: imageData } = parseDataUrl(data.scanImageDataUrl);

    // Mock model: real Gemini avatar generation is disabled for now (blocked on
    // image-gen quota) — serve the static placeholder in public/images/model.png instead.
    await new Promise((r) => setTimeout(r, 1500));

    // Storage is a service-role op (bucket policy is out of scope here).
    const admin = adminClient();
    const sourcePath = await uploadImage(admin, mimeType, Buffer.from(imageData, "base64"), "jpg");
    const mockAvatarBytes = await readFile(MOCK_AVATAR_PATH);
    const avatarPath = await uploadImage(admin, "image/png", mockAvatarBytes, "png");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase.from("body_models" as any) as any)
      .insert({
        user_id: context.userId,
        height_cm: data.heightCm,
        weight_kg: data.weightKg,
        gender: data.gender || null,
        source_image_url: sourcePath,
        avatar_image_url: avatarPath,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const model = mapRow(row);
    return {
      ...model,
      sourceImageUrl: await signedUrl(admin, model.sourceImageUrl),
      avatarImageUrl: await signedUrl(admin, model.avatarImageUrl),
    };
  });
