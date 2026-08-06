import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OutfitWear } from "./wardrobe";

// No server-side date fallback on purpose: `toISOString()` is UTC and would
// write the wrong day near midnight — now a real collision, since (user, date)
// is unique. The client sends its own local date key.

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

const DATE_KEY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "wornDate must be YYYY-MM-DD");

const LogWearInput = z.object({
  matchId: z.string(),
  wornDate: DATE_KEY,
});

// One outfit per day: upsert on the (user_id, worn_date) unique index from
// migration 017, so picking a second match for a day REPLACES the first
// instead of stacking. 014's `for all` RLS policy already covers the UPDATE.
export const logWear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LogWearInput.parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.from("outfit_wears" as any) as any).upsert(
      {
        user_id: context.userId,
        match_id: data.matchId,
        worn_date: data.wornDate,
      },
      { onConflict: "user_id,worn_date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Clears by date rather than row id — the toggle-off path can't race a stale id
// from another tab. `context.supabase` is the anon key + caller's JWT, so 014's
// RLS already scopes this; the explicit user_id filter keeps a delete-by-shared-
// value from depending on a policy defined in another file.
export const clearWear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ wornDate: DATE_KEY }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase.from("outfit_wears" as any) as any)
      .delete()
      .eq("user_id", context.userId)
      .eq("worn_date", data.wornDate);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
