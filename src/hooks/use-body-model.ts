import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getBodyModel, generateBodyModel, type BodyModel } from "@/lib/body-model.functions";
import { useAuth } from "@/hooks/use-auth";

export const BODY_MODEL_QUERY_KEY = ["body-model"];

export type GenerateBodyModelInput = {
  scanImageDataUrl: string;
  heightCm: number;
  weightKg: number;
  gender?: "male" | "female" | "other" | "";
};

export function useBodyModel() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getBodyModel);
  const generateFn = useServerFn(generateBodyModel);

  const { data: bodyModel = null, isLoading } = useQuery<BodyModel | null>({
    // key scoped to the user so account switch can't serve a stale body model
    queryKey: [...BODY_MODEL_QUERY_KEY, session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
    staleTime: 30_000,
  });

  const generateMutation = useMutation({
    mutationFn: (input: GenerateBodyModelInput) => generateFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: BODY_MODEL_QUERY_KEY }),
    onError: (err) => toast.error(`สร้างโมเดลไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    bodyModel,
    // `!session ||` for the same reason as useStore (B12b-L2): a query disabled
    // by `enabled: !!session` reports isLoading===false with data===undefined,
    // and virtual-model.tsx reads bodyModel in useState INITIALIZERS, which
    // never re-run — so a cold load permanently stranded a user with a saved
    // model on the measure wizard (UX-1).
    isLoading: !session || isLoading,
    generate: (input: GenerateBodyModelInput) => generateMutation.mutateAsync(input),
    isGenerating: generateMutation.isPending,
  };
}
