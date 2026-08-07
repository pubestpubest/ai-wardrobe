import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Profile } from "@/hooks/use-profile";

// ponytail: profiles not in generated types.ts (gen types not run here); cast
function profilesTable(supabase: unknown) {
  return (supabase as SupabaseClient).from("profiles");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Profile {
  return {
    name: row.name ?? "",
    handle: row.handle ?? "",
    email: row.email ?? "",
    bio: row.bio ?? "",
    favoriteStyle: row.favorite_style ?? "",
    avatarUrl: row.avatar_url ?? "",
    gender: row.gender ?? "",
    birthdate: row.birthdate ?? "",
    heightCm: row.height_cm ?? "",
    weightKg: row.weight_kg ?? "",
    // Round-trip only — never written here. `authenticated` has no grant on
    // this column (018/019); it's set exclusively by store.functions.ts's
    // createStore through the service-role client.
    role: row.role ?? "shopper",
  };
}

// ─── Fetch the caller's profile ───────────────────────────────────────────────

export const getProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d))
  .handler(async ({ context }) => {
    const { data: row, error } = await profilesTable(context.supabase)
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? mapRow(row) : null;
  });

// ─── Upsert (create or update) the caller's profile ───────────────────────────

const ProfilePatchSchema = z.object({
  name: z.string().optional(),
  handle: z.string().optional(),
  email: z.string().optional(),
  bio: z.string().optional(),
  favoriteStyle: z.string().optional(),
  avatarUrl: z.string().optional(),
  gender: z.string().optional(),
  birthdate: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
});

export const upsertProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfilePatchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await profilesTable(context.supabase).upsert(
      {
        user_id: context.userId,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.handle !== undefined && { handle: data.handle }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.favoriteStyle !== undefined && { favorite_style: data.favoriteStyle }),
        ...(data.avatarUrl !== undefined && { avatar_url: data.avatarUrl }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.birthdate !== undefined && { birthdate: data.birthdate || null }),
        ...(data.heightCm !== undefined && { height_cm: data.heightCm }),
        ...(data.weightKg !== undefined && { weight_kg: data.weightKg }),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
