import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyStoreItems,
  createStoreItem,
  updateStoreItem,
  deleteStoreItem,
} from "@/lib/store-items.functions";
import { useAuth } from "@/hooks/use-auth";
import { STORE_QUERY_KEY } from "@/hooks/use-store";
import type { AffiliateProduct } from "@/lib/wardrobe";

export const STORE_ITEMS_QUERY_KEY = ["store-items"];

// `store`/`platform` describe a MARKETPLACE listing (LOCAL-STORE.md §1) — a
// store owner never writes them, so they're excluded here too, not just
// hidden in the UI.
export type CreateStoreItemInput = Omit<AffiliateProduct, "id" | "store" | "platform">;
export type UpdateStoreItemInput = Partial<CreateStoreItemInput>;

// B13b: create/update/delete added on top of B13a's read-only wrapper.
// Modeled on use-store.ts; same disabled-query trap, same fix.
// zod failures arrive as a JSON blob of issues. Showing that raw in a Thai UI is
// unreadable, so surface the first issue's message (our schemas carry Thai
// messages). Anything else passes through unchanged.
function readable(err: unknown): string {
  const msg = (err as Error)?.message ?? "";
  if (msg.trim().startsWith("[")) {
    try {
      const issues = JSON.parse(msg);
      if (Array.isArray(issues) && issues[0]?.message) return issues[0].message;
      // eslint-disable-next-line no-empty
    } catch {}
  }
  return msg;
}

export function useStoreItems() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getMyStoreItems);
  const createFn = useServerFn(createStoreItem);
  const updateFn = useServerFn(updateStoreItem);
  const deleteFn = useServerFn(deleteStoreItem);

  const { data, isLoading, isError } = useQuery({
    // key scoped to the user so account switch can't serve a stale list
    queryKey: [...STORE_ITEMS_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
  });

  // Invalidates BOTH keys: getMyStore's itemCount feeds /store/package's
  // n/maxItems quota (and store.items.tsx's own quota display) — a mutation
  // that only invalidated the items key would leave that count stale until
  // an unrelated refetch (B13b-L1 plan item 4; LOCAL-STORE.md §4).
  const invalidateBoth = () => {
    qc.invalidateQueries({ queryKey: STORE_ITEMS_QUERY_KEY });
    qc.invalidateQueries({ queryKey: STORE_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateStoreItemInput) => createFn({ data: input }),
    onSuccess: invalidateBoth,
    onError: (err) => toast.error(`เพิ่มไอเท็มไม่สำเร็จ: ${readable(err)}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateStoreItemInput }) =>
      updateFn({ data: { id, patch } }),
    onSuccess: invalidateBoth,
    onError: (err) => toast.error(`บันทึกไอเท็มไม่สำเร็จ: ${readable(err)}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidateBoth,
    onError: (err) => toast.error(`ลบไอเท็มไม่สำเร็จ: ${readable(err)}`),
  });

  return {
    items: data ?? [],
    // `!session ||` is load-bearing: TanStack v5 computes
    // `isLoading = isPending && isFetching`, so a query disabled via
    // `enabled: !!session` reports isLoading===false with data===undefined.
    // AuthGate renders children during SSR and the client auth-loading window,
    // so without this every consumer sees `items === [], isLoading === false`
    // and takes the empty-list branch on a cold load — B12b-L2/L3's trap,
    // reproduced here so /store/items doesn't reintroduce it.
    isLoading: !session || isLoading,
    // Surfaced separately so consumers can tell "you have no items" from "the
    // fetch failed" — same reasoning as useStore's isError (B12b-L3).
    isError,
    create: (input: CreateStoreItemInput) => createMutation.mutateAsync(input),
    isCreating: createMutation.isPending,
    update: (id: string, patch: UpdateStoreItemInput) => updateMutation.mutateAsync({ id, patch }),
    isUpdating: updateMutation.isPending,
    remove: (id: string) => deleteMutation.mutateAsync(id),
    isDeleting: deleteMutation.isPending,
  } satisfies {
    items: AffiliateProduct[];
    isLoading: boolean;
    isError: boolean;
    create: (input: CreateStoreItemInput) => Promise<AffiliateProduct>;
    isCreating: boolean;
    update: (id: string, patch: UpdateStoreItemInput) => Promise<AffiliateProduct>;
    isUpdating: boolean;
    remove: (id: string) => Promise<{ ok: true }>;
    isDeleting: boolean;
  };
}
