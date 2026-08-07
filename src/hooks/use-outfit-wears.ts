import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getWears, logWear, clearWear } from "@/lib/outfit-wears.functions";
import { localDateKey, type OutfitWear } from "@/lib/wardrobe";
import { useAuth } from "@/hooks/use-auth";
import { useGuestGuard } from "@/hooks/use-guest";

export const OUTFIT_WEARS_QUERY_KEY = ["outfit-wears"];

export function useOutfitWears() {
  const { session } = useAuth();
  const blockIfGuest = useGuestGuard();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getWears);
  const logFn = useServerFn(logWear);
  const clearFn = useServerFn(clearWear);

  const { data: wears = [], isLoading } = useQuery<OutfitWear[]>({
    // key scoped to the user so account switch can't serve stale wears
    queryKey: [...OUTFIT_WEARS_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: OUTFIT_WEARS_QUERY_KEY });

  const toggleMutation = useMutation({
    mutationFn: async ({ matchId, wornDate }: { matchId: string; wornDate?: string }) => {
      const date = wornDate ?? localDateKey();
      const current = wears.find((w) => w.wornDate === date);
      // Same match already on that day → un-set it. Anything else (empty day, a
      // different match, or an orphaned row) → upsert, which replaces.
      if (current?.matchId === matchId) {
        await clearFn({ data: { wornDate: date } });
        return { cleared: true };
      }
      await logFn({ data: { matchId, wornDate: date } });
      return { cleared: false };
    },
    onSuccess: ({ cleared }) => {
      invalidate();
      toast.success(cleared ? "เอาชุดออกจากวันนี้แล้ว" : "บันทึกการใส่ชุดแล้ว");
    },
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    wears,
    // `!session ||`: TanStack v5 computes isLoading = isPending && isFetching,
    // so a query disabled by `enabled: !!session` reports isLoading===false with
    // empty data. AuthGate renders children during SSR and the client auth
    // window, so a raw value makes consumers flash their empty state on a cold
    // load. No spinner-forever risk: once mounted && !loading && !session,
    // AuthGate renders the sign-in screen instead of children.
    isLoading: !session || isLoading,
    /** Match worn on a given day, or undefined. */
    wornMatchId: (date = localDateKey()) => wears.find((w) => w.wornDate === date)?.matchId,
    toggleWear: (args: { matchId: string; wornDate?: string }) =>
      blockIfGuest("บันทึกว่าใส่ชุดนี้") ? Promise.resolve(null) : toggleMutation.mutateAsync(args),
    isToggling: toggleMutation.isPending,
  };
}
