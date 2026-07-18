import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
    tags: row.tags ?? [],
    formality: row.formality,
    emoji: row.emoji ?? "👕",
    imageUrl: row.image_url ?? undefined,
    wearCount: row.wear_count ?? 0,
    lastWorn: row.last_worn ?? null,
    createdAt: row.created_at,
  };
}

// ─── Fetch all items ──────────────────────────────────────────────────────────

export const getItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

// ─── Save a new item ──────────────────────────────────────────────────────────

const ItemInputSchema = z.object({
  item: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    color: z.string(),
    style: z.array(z.string()),
    tags: z.array(z.string()).optional(),
    formality: z.string(),
    emoji: z.string(),
    imageUrl: z.string().optional(),
  }),
});

export const saveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ItemInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("items").insert({
      id: data.item.id,
      user_id: context.userId,
      name: data.item.name,
      category: data.item.category,
      color: data.item.color,
      style: data.item.style,
      tags: data.item.tags ?? [],
      formality: data.item.formality,
      emoji: data.item.emoji,
      image_url: data.item.imageUrl ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Delete an item (also removes image from storage) ────────────────────────

export const updateItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string(),
        patch: z.object({
          name: z.string().optional(),
          category: z.string().optional(),
          color: z.string().optional(),
          style: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional(),
          formality: z.string().optional(),
          emoji: z.string().optional(),
          imageUrl: z.string().optional(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...data.patch };
    if (updateData.imageUrl !== undefined) {
      updateData.image_url = updateData.imageUrl;
      delete updateData.imageUrl;
    }
    const { error } = await context.supabase.from("items").update(updateData).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Delete an item (also removes image from storage) ────────────────────────

export const removeItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    // Derive the image path from the caller's OWN row (RLS-scoped) — never trust a
    // client-supplied URL, or a user could delete another user's storage object.
    const { data: row } = await context.supabase
      .from("items")
      .select("image_url")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase.from("items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row?.image_url) {
      const path = new URL(row.image_url).pathname.split("/object/public/wardrobe-images/")[1];
      // Storage removal needs the service-role client (bucket policy is out of scope here).
      if (path) await adminClient().storage.from("wardrobe-images").remove([path]);
    }
    return { ok: true };
  });

// ─── Increment wear count ─────────────────────────────────────────────────────

export const wearItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("items")
      .select("wear_count")
      .eq("id", data.id)
      .single();
    const { error } = await context.supabase
      .from("items")
      .update({
        wear_count: (row?.wear_count ?? 0) + 1,
        last_worn: new Date().toISOString().split("T")[0],
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── One-time: claim pre-auth (NULL user_id) rows across items/matches/body_models ──

export const claimOrphans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    // RLS hides NULL-user rows from the user-scoped client — service role required here.
    const admin = adminClient();

    const { data: items, error: itemsError } = await admin
      .from("items")
      .update({ user_id: context.userId })
      .is("user_id", null)
      .select("id");
    if (itemsError) throw new Error(itemsError.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: matches, error: matchesError } = await (admin.from("matches" as any) as any)
      .update({ user_id: context.userId })
      .is("user_id", null)
      .select("id");
    if (matchesError) throw new Error(matchesError.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyModelsTable = admin.from("body_models" as any) as any;
    const { data: bodyModels, error: bodyModelsError } = await bodyModelsTable
      .update({ user_id: context.userId })
      .is("user_id", null)
      .select("id");
    if (bodyModelsError) throw new Error(bodyModelsError.message);

    return {
      items: items?.length ?? 0,
      matches: matches?.length ?? 0,
      bodyModels: bodyModels?.length ?? 0,
    };
  });
