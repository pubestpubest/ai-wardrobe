import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getItems, saveItem, removeItem, wearItem, updateItem } from "@/lib/items.functions";
import type { WardrobeItem } from "@/lib/wardrobe";

export type StoredItem = WardrobeItem;

export const WARDROBE_QUERY_KEY = ["wardrobe"];

export function useWardrobe() {
  const qc = useQueryClient();

  const fetchFn = useServerFn(getItems);
  const saveFn = useServerFn(saveItem);
  const removeFn = useServerFn(removeItem);
  const wearFn = useServerFn(wearItem);

  const { data: items = [], isLoading } = useQuery({
    queryKey: WARDROBE_QUERY_KEY,
    queryFn: () => fetchFn({ data: {} }),
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

  return {
    items,
    isLoading,
    // Returns a promise so callers can await and catch errors
    add: (item: WardrobeItem) => addMutation.mutateAsync(item),
    update: (id: string, patch: Partial<StoredItem>) => updateMutation.mutate({ id, patch }),
    remove: (id: string, imageUrl?: string) => deleteMutation.mutate({ id, imageUrl }),
    markWorn: (id: string) => wearMutation.mutate(id),
  };
}
