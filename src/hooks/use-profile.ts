import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getProfile, upsertProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";

export type Gender = "" | "male" | "female" | "other";

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
    mutationFn: (patch: Partial<Profile>) => upsertFn({ data: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
    onError: (err) => toast.error(`บันทึกโปรไฟล์ไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    profile: data ?? DEFAULT_PROFILE,
    update: (patch: Partial<Profile>) => updateMutation.mutate(patch),
    isLoading,
  };
}
