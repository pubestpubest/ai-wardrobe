import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getItems,
  saveItem,
  removeItem,
  wearItem,
  updateItem,
  claimOrphans,
} from "@/lib/items.functions";
import type { WardrobeItem } from "@/lib/wardrobe";
import { useAuth } from "@/hooks/use-auth";
import { useGuestGuard } from "@/hooks/use-guest";
import { MATCHES_QUERY_KEY } from "@/hooks/use-matches";
import { BODY_MODEL_QUERY_KEY } from "@/hooks/use-body-model";

export type StoredItem = WardrobeItem;

export const WARDROBE_QUERY_KEY = ["wardrobe"];

export function useWardrobe() {
  const { session } = useAuth();
  const blockIfGuest = useGuestGuard();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getItems);
  const saveFn = useServerFn(saveItem);
  const removeFn = useServerFn(removeItem);
  const wearFn = useServerFn(wearItem);
  const claimOrphansFn = useServerFn(claimOrphans);

  const { data: items = [], isLoading } = useQuery({
    // key scoped to the user so account switch can't serve a stale wardrobe
    queryKey: [...WARDROBE_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: WARDROBE_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (item: WardrobeItem) =>
      saveFn({ data: { item: { ...item, imageUrl: item.imageUrl } } }),
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${(err as Error).message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, imageUrl }: { id: string; imageUrl?: string }) =>
      removeFn({ data: { id, imageUrl } }),
    onSuccess: () => {
      invalidate();
      toast.success("ลบไอเท็มแล้ว");
    },
    onError: (err) => toast.error(`ลบไม่สำเร็จ: ${(err as Error).message}`),
  });

  const updateFn = useServerFn(updateItem);

  const wearMutation = useMutation({
    mutationFn: (id: string) => wearFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<StoredItem> }) =>
      updateFn({ data: { id, patch } }),
    onSuccess: () => {
      invalidate();
      toast.success("แก้ไขไอเท็มแล้ว");
    },
    onError: (err) => toast.error(`แก้ไขไม่สำเร็จ: ${(err as Error).message}`),
  });

  const claimOrphansMutation = useMutation({
    mutationFn: () => claimOrphansFn({ data: {} }),
    onSuccess: ({ items: claimedItems, matches, bodyModels }) => {
      invalidate();
      qc.invalidateQueries({ queryKey: MATCHES_QUERY_KEY });
      qc.invalidateQueries({ queryKey: BODY_MODEL_QUERY_KEY });
      const total = claimedItems + matches + bodyModels;
      toast.success(`อ้างสิทธิ์ข้อมูลเดิม ${total} รายการแล้ว`);
    },
    onError: (err) => toast.error(`อ้างสิทธิ์ไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    items,
    // `!session ||`: TanStack v5 computes isLoading = isPending && isFetching,
    // so a query disabled by `enabled: !!session` reports isLoading===false with
    // empty data. AuthGate renders children during SSR and the client auth
    // window, so a raw value makes consumers flash their empty state on a cold
    // load. No spinner-forever risk: once mounted && !loading && !session,
    // AuthGate renders the sign-in screen instead of children.
    isLoading: !session || isLoading,
    // Returns a promise so callers can await and catch errors
    // Guarded at the hook, not in each component: every write path in the app
    // funnels through here, and 029 refuses a guest at the database anyway —
    // this is what turns that refusal into an explanation.
    add: (item: WardrobeItem) =>
      blockIfGuest("เพิ่มเสื้อผ้า") ? Promise.resolve(null) : addMutation.mutateAsync(item),
    update: (id: string, patch: Partial<StoredItem>) =>
      blockIfGuest("แก้ไขเสื้อผ้า") || updateMutation.mutate({ id, patch }),
    remove: (id: string, imageUrl?: string) =>
      blockIfGuest("ลบเสื้อผ้า") || deleteMutation.mutate({ id, imageUrl }),
    markWorn: (id: string) => blockIfGuest("บันทึกการใส่") || wearMutation.mutate(id),
    claimOrphans: () => blockIfGuest() || claimOrphansMutation.mutate(),
  };
}
