import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMatches, saveMatch, updateMatch, removeMatch } from "@/lib/matches.functions";
import type { Match, MatchSource } from "@/lib/wardrobe";
import { useAuth } from "@/hooks/use-auth";
import { useGuestGuard } from "@/hooks/use-guest";

export const MATCHES_QUERY_KEY = ["matches"];

export type NewMatch = {
  name: string;
  itemIds: string[];
  affiliateProductIds?: string[];
  occasion?: string;
  note?: string;
  reason?: string;
  source?: MatchSource;
};

export type MatchPatch = {
  name?: string;
  itemIds?: string[];
  affiliateProductIds?: string[];
  occasion?: string;
  note?: string;
  reason?: string;
};

export function useMatches() {
  const { session } = useAuth();
  const blockIfGuest = useGuestGuard();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getMatches);
  const saveFn = useServerFn(saveMatch);
  const updateFn = useServerFn(updateMatch);
  const removeFn = useServerFn(removeMatch);

  const { data: matches = [], isLoading } = useQuery<Match[]>({
    // key scoped to the user so account switch can't serve stale matches
    queryKey: [...MATCHES_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: MATCHES_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (m: NewMatch) =>
      saveFn({ data: { match: { ...m, source: m.source ?? "manual" } } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${(err as Error).message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: MatchPatch }) =>
      updateFn({ data: { id, patch } }),
    onSuccess: () => {
      invalidate();
      toast.success("แก้ไขแมตช์แล้ว");
    },
    onError: (err) => toast.error(`แก้ไขไม่สำเร็จ: ${(err as Error).message}`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("ลบแมตช์แล้ว");
    },
    onError: (err) => toast.error(`ลบไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    matches,
    isLoading,
    add: (m: NewMatch) =>
      blockIfGuest("บันทึกแมตช์") ? Promise.resolve(null) : addMutation.mutateAsync(m),
    update: (id: string, patch: MatchPatch) =>
      blockIfGuest("แก้ไขแมตช์")
        ? Promise.resolve(null)
        : updateMutation.mutateAsync({ id, patch }),
    remove: (id: string) => blockIfGuest("ลบแมตช์") || removeMutation.mutate(id),
  };
}
