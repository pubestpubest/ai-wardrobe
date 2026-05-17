import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "wardrobe-images";

const InputSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(8_000_000),
});

export const uploadWardrobeImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ไม่ได้ตั้งค่า");

    const [header, base64] = data.imageDataUrl.split(",");
    const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    const bytes = Buffer.from(base64, "base64");
    const path = `${crypto.randomUUID()}.jpg`;

    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);

    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl };
  });
