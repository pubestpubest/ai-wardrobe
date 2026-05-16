import { supabase } from "@/integrations/supabase/client";

const BUCKET = "wardrobe-images";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadWardrobeImage(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const path = `${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

export async function deleteWardrobeImage(publicUrl: string): Promise<void> {
  const url = new URL(publicUrl);
  // path is /storage/v1/object/public/wardrobe-images/<uuid>.jpg
  const path = url.pathname.split(`/object/public/${BUCKET}/`)[1];
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
