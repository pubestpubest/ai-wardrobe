import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { WardrobeItem } from "./wardrobe";

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ไม่ได้ตั้งค่า");
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): WardrobeItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    style: row.style ?? [],
    formality: row.formality,
    emoji: row.emoji ?? "👕",
    imageUrl: row.image_url ?? undefined,
    wearCount: row.wear_count ?? 0,
    lastWorn: row.last_worn ?? null,
    createdAt: row.created_at,
  };
}

// ─── Fetch all items for a session ───────────────────────────────────────────

export const getItems = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ sessionId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows, error } = await adminClient()
      .from("items")
      .select("*")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

// ─── Save a new item ──────────────────────────────────────────────────────────

const ItemInputSchema = z.object({
  sessionId: z.string(),
  item: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    color: z.string(),
    style: z.array(z.string()),
    formality: z.string(),
    emoji: z.string(),
    imageUrl: z.string().optional(),
  }),
});

export const saveItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ItemInputSchema.parse(d))
  .handler(async ({ data }) => {
    const { error } = await adminClient()
      .from("items")
      .insert({
        id: data.item.id,
        session_id: data.sessionId,
        name: data.item.name,
        category: data.item.category,
        color: data.item.color,
        style: data.item.style,
        formality: data.item.formality,
        emoji: data.item.emoji,
        image_url: data.item.imageUrl ?? null,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Delete an item (also removes image from storage) ────────────────────────

export const removeItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string(), imageUrl: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const admin = adminClient();

    if (data.imageUrl) {
      const url = new URL(data.imageUrl);
      const path = url.pathname.split("/object/public/wardrobe-images/")[1];
      if (path) await admin.storage.from("wardrobe-images").remove([path]);
    }

    const { error } = await admin.from("items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Increment wear count ─────────────────────────────────────────────────────

export const wearItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = adminClient();
    const { data: row } = await admin.from("items").select("wear_count").eq("id", data.id).single();
    const { error } = await admin
      .from("items")
      .update({
        wear_count: (row?.wear_count ?? 0) + 1,
        last_worn: new Date().toISOString().split("T")[0],
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
