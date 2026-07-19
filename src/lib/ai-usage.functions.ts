import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Read-only: today's AI call counts for the caller (does NOT increment, unlike bump_ai_usage).
export const getAiUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }): Promise<{ chat: number; analyze: number }> => {
    // UTC date matches the DB's current_date used by bump_ai_usage.
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await (context.supabase as unknown as SupabaseClient)
      .from("ai_usage")
      .select("kind, count")
      .eq("user_id", context.userId)
      .eq("usage_date", today);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { kind: string; count: number }[];
    const byKind = (k: string) => rows.find((r) => r.kind === k)?.count ?? 0;
    return { chat: byKind("chat"), analyze: byKind("analyze") };
  });
