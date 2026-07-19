import type { SupabaseClient } from "@supabase/supabase-js";

// ponytail: bump_ai_usage not in generated types.ts (gen types not run here); cast
export async function enforceAiQuota(
  supabase: unknown,
  kind: string,
  limit: number,
): Promise<void> {
  const { data, error } = await (supabase as SupabaseClient).rpc("bump_ai_usage", {
    p_kind: kind,
  });
  if (error) throw new Error(error.message);
  const count = typeof data === "number" ? data : Number(data);
  if (count > limit) {
    throw new Error("ใช้ครบโควตา AI วันนี้แล้ว (ลองใหม่พรุ่งนี้นะ)");
  }
}
