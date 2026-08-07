import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyStore, createStore } from "@/lib/store.functions";
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

export const STORE_QUERY_KEY = ["store"];

export function useStore() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getMyStore);
  const createFn = useServerFn(createStore);

  const { data, isLoading } = useQuery({
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

  return {
    store: data ?? null,
    isLoading,
    create: (input: CreateStoreInput) => createMutation.mutateAsync(input),
    isCreating: createMutation.isPending,
  };
}
