import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getProfile, upsertProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
// Imported directly, not via useGuestGuard: that hook reads useProfile, so
// going through it here would be a module cycle.
import { openGuestGate } from "@/lib/guest-gate";

export type Gender = "" | "male" | "female" | "other";

// Set exclusively by store.functions.ts's createStore via the service-role
// client — `authenticated` has no grant on this column (018/019), so it can
// never be written through upsertProfile.
export type Role = "shopper" | "store" | "guest";

export type Profile = {
  name: string;
  handle: string;
  email: string;
  bio: string;
  favoriteStyle: string;
  avatarUrl: string;
  gender: Gender;
  birthdate: string;
  heightCm: string;
  weightKg: string;
  role: Role;
};

export const DEFAULT_PROFILE: Profile = {
  name: "",
  handle: "",
  email: "",
  bio: "",
  favoriteStyle: "",
  avatarUrl: "",
  gender: "",
  birthdate: "",
  heightCm: "",
  weightKg: "",
  role: "shopper",
};

export function isProfileComplete(p: Profile): boolean {
  if (!p.name.trim() || !p.gender || !p.birthdate) return false;
  const d = new Date(p.birthdate);
  return !Number.isNaN(d.getTime()) && d <= new Date();
}

export const PROFILE_QUERY_KEY = ["profile"];

export function useProfile() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getProfile);
  const upsertFn = useServerFn(upsertProfile);

  const { data, isLoading } = useQuery({
    // key scoped to the user so account switch can't serve a stale profile
    queryKey: [...PROFILE_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Omit<Profile, "role">>) => upsertFn({ data: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
    onError: (err) => toast.error(`บันทึกโปรไฟล์ไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    profile: data ?? DEFAULT_PROFILE,
    update: (patch: Partial<Omit<Profile, "role">>) => {
      if ((data ?? DEFAULT_PROFILE).role === "guest") return openGuestGate("แก้ไขโปรไฟล์");
      updateMutation.mutate(patch);
    },
    // `!session ||`: TanStack v5 computes isLoading = isPending && isFetching,
    // so a query disabled by `enabled: !!session` reports isLoading===false with
    // empty data. AuthGate renders children during SSR and the client auth
    // window, so a raw value makes consumers flash their empty state on a cold
    // load. No spinner-forever risk: once mounted && !loading && !session,
    // AuthGate renders the sign-in screen instead of children.
    isLoading: !session || isLoading,
  };
}
