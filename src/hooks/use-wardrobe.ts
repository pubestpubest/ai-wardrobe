import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getItems, saveItem, removeItem, wearItem } from "@/lib/items.functions";
import type { WardrobeItem } from "@/lib/wardrobe";

export type { WardrobeItem as StoredItem };

const SESSION_KEY = "wardrobe-session-id";

export function getSessionId(): string {
  // Never run during SSR — localStorage is client-only
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export const WARDROBE_QUERY_KEY = ["wardrobe"];

export function useWardrobe() {
  const qc = useQueryClient();
  const sessionId = getSessionId();

  const fetchFn = useServerFn(getItems);
  const saveFn = useServerFn(saveItem);
  const removeFn = useServerFn(removeItem);
  const wearFn = useServerFn(wearItem);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [...WARDROBE_QUERY_KEY, sessionId],
    queryFn: () => fetchFn({ data: { sessionId } }),
    // Only fetch client-side when we have a real session ID
    enabled: !!sessionId,
    staleTime: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: WARDROBE_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (item: WardrobeItem) =>
      saveFn({ data: { sessionId, item: { ...item, imageUrl: item.imageUrl } } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(`บันทึกไม่สำเร็จ: ${(err as Error).message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, imageUrl }: { id: string; imageUrl?: string }) =>
      removeFn({ data: { id, imageUrl } }),
    onSuccess: invalidate,
    onError: (err) => toast.error(`ลบไม่สำเร็จ: ${(err as Error).message}`),
  });

  const wearMutation = useMutation({
    mutationFn: (id: string) => wearFn({ data: { id } }),
    onSuccess: invalidate,
  });

  return {
    items,
    isLoading,
    // Returns a promise so callers can await and catch errors
    add: (item: WardrobeItem) => addMutation.mutateAsync(item),
    remove: (id: string, imageUrl?: string) => deleteMutation.mutate({ id, imageUrl }),
    markWorn: (id: string) => wearMutation.mutate(id),
  };
}
