import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyStore, createStore, updateStore } from "@/lib/store.functions";
import { useAuth } from "@/hooks/use-auth";
import { PROFILE_QUERY_KEY } from "@/hooks/use-profile";
import type { StorePackage } from "@/lib/wardrobe";

export type Store = {
  id: string;
  name: string;
  description: string;
  contactPhone: string;
  contactLine: string;
  contactEmail: string;
  address: string;
  googleMapUrl: string;
  onlineStoreUrl: string;
  logoUrl: string;
  coverUrl: string;
  package: StorePackage;
  status: "approved" | "suspended";
  createdAt: string;
  // Only populated by getMyStore (LOCAL-STORE.md §4's item quota) — optional
  // so updateStore's plain mapRow() return still satisfies this type.
  itemCount?: number;
};

export type CreateStoreInput = {
  name: string;
  description?: string;
  contactPhone?: string;
  contactLine?: string;
  contactEmail?: string;
  address?: string;
  googleMapUrl?: string;
  onlineStoreUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
};

export type UpdateStoreInput = CreateStoreInput;

export const STORE_QUERY_KEY = ["store"];

export function useStore() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getMyStore);
  const createFn = useServerFn(createStore);
  const updateFn = useServerFn(updateStore);

  const { data, isLoading, isError } = useQuery({
    // key scoped to the user so account switch can't serve a stale store
    queryKey: [...STORE_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateStoreInput) => createFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STORE_QUERY_KEY });
      // createStore flips profiles.role — B12b's redirect guard reads it, so
      // refetch the profile now rather than leaving it stale until a reload.
      qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
    onError: (err) => toast.error(`สมัครร้านค้าไม่สำเร็จ: ${(err as Error).message}`),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateStoreInput) => updateFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: STORE_QUERY_KEY }),
    onError: (err) => toast.error(`บันทึกข้อมูลร้านค้าไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    store: data ?? null,
    // `!session ||` is load-bearing: TanStack v5 computes
    // `isLoading = isPending && isFetching`, so a query disabled via
    // `enabled: !!session` reports isLoading===false with data===undefined.
    // AuthGate renders children during SSR and the client auth-loading window,
    // so without this every consumer sees `store === null, isLoading === false`
    // and takes its no-store branch — /store/package redirected away on any
    // refresh or bookmark, /store flashed the registration form at real owners.
    isLoading: !session || isLoading,
    // Surfaced separately so consumers can tell "you have no store" from "the
    // fetch failed". Without it a thrown getMyStore (offline, 5xx, or the
    // affiliate_products count erroring) leaves store===null with isLoading
    // false — which is the SAME no-store branch the L2 blocker took, reached
    // through a different door: /store/package redirects away and /store shows
    // a real owner the registration form.
    isError,
    create: (input: CreateStoreInput) => createMutation.mutateAsync(input),
    isCreating: createMutation.isPending,
    update: (input: UpdateStoreInput) => updateMutation.mutateAsync(input),
    isUpdating: updateMutation.isPending,
  };
}
