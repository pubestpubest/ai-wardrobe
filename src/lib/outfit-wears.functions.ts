import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OutfitWear } from "./wardrobe";

function today() {
  return new Date().toISOString().split("T")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): OutfitWear {
  return {
    id: row.id,
    matchId: row.match_id,
    wornDate: row.worn_date,
  };
}

export const getWears = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase.from("outfit_wears" as any) as any)
      .select("*")
      .order("worn_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

const LogWearInput = z.object({
  matchId: z.string(),
  wornDate: z.string().optional(),
});

export const logWear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LogWearInput.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.from("outfit_wears" as any) as any).insert({
      user_id: context.userId,
      match_id: data.matchId,
      worn_date: data.wornDate ?? today(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeWear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.from("outfit_wears" as any) as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
