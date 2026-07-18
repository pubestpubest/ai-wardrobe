import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getWears, logWear, removeWear } from "@/lib/outfit-wears.functions";
import type { OutfitWear } from "@/lib/wardrobe";
import { useAuth } from "@/hooks/use-auth";

export const OUTFIT_WEARS_QUERY_KEY = ["outfit-wears"];

// Local calendar date (not UTC) — the calendar renders in local time, so the
// stored worn_date must be the user's local day or it lands on the wrong cell.
function localDateKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function useOutfitWears() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getWears);
  const logFn = useServerFn(logWear);
  const removeFn = useServerFn(removeWear);

  const { data: wears = [], isLoading } = useQuery<OutfitWear[]>({
    // key scoped to the user so account switch can't serve stale wears
    queryKey: [...OUTFIT_WEARS_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: OUTFIT_WEARS_QUERY_KEY });

  const logMutation = useMutation({
    mutationFn: ({ matchId, wornDate }: { matchId: string; wornDate?: string }) =>
      logFn({ data: { matchId, wornDate: wornDate ?? localDateKey() } }),
    onSuccess: () => {
      invalidate();
      toast.success("บันทึกการใส่ชุดแล้ว");
    },
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${(err as Error).message}`),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("ลบแล้ว");
    },
    onError: (err) => toast.error(`ลบไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    wears,
    isLoading,
    logWear: (args: { matchId: string; wornDate?: string }) => logMutation.mutateAsync(args),
    removeWear: (id: string) => removeMutation.mutate(id),
  };
}
