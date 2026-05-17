import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Match } from "./wardrobe";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Match {
  return {
    id: row.id,
    name: row.name,
    itemIds: row.item_ids ?? [],
    occasion: row.occasion ?? undefined,
    note: row.note ?? undefined,
    reason: row.reason ?? undefined,
    source: row.source === "ai" ? "ai" : "manual",
    createdAt: row.created_at,
  };
}

export const getMatches = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (adminClient().from("matches" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

const SaveMatchInput = z.object({
  match: z.object({
    name: z.string().min(1),
    itemIds: z.array(z.string()).min(1),
    occasion: z.string().optional(),
    note: z.string().optional(),
    reason: z.string().optional(),
    source: z.enum(["manual", "ai"]).default("manual"),
  }),
});

export const saveMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SaveMatchInput.parse(d))
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (adminClient().from("matches" as any) as any)
      .insert({
        name: data.match.name,
        item_ids: data.match.itemIds,
        occasion: data.match.occasion ?? null,
        note: data.match.note ?? null,
        reason: data.match.reason ?? null,
        source: data.match.source,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(rows);
  });

const UpdateMatchInput = z.object({
  id: z.string(),
  patch: z.object({
    name: z.string().min(1).optional(),
    itemIds: z.array(z.string()).optional(),
    occasion: z.string().optional(),
    note: z.string().optional(),
    reason: z.string().optional(),
  }),
});

export const updateMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => UpdateMatchInput.parse(d))
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (data.patch.name !== undefined) updateData.name = data.patch.name;
    if (data.patch.itemIds !== undefined) updateData.item_ids = data.patch.itemIds;
    if (data.patch.occasion !== undefined)
      updateData.occasion = data.patch.occasion.trim() ? data.patch.occasion.trim() : null;
    if (data.patch.note !== undefined)
      updateData.note = data.patch.note.trim() ? data.patch.note.trim() : null;
    if (data.patch.reason !== undefined)
      updateData.reason = data.patch.reason.trim() ? data.patch.reason.trim() : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient().from("matches" as any) as any)
      .update(updateData)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMatch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient().from("matches" as any) as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
