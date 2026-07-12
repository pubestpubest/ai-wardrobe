import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getBodyModel, generateBodyModel, type BodyModel } from "@/lib/body-model.functions";

export const BODY_MODEL_QUERY_KEY = ["body-model"];

export type GenerateBodyModelInput = {
  scanImageDataUrl: string;
  heightCm: number;
  weightKg: number;
  gender?: "male" | "female" | "other" | "";
};

export function useBodyModel() {
  const qc = useQueryClient();

  const fetchFn = useServerFn(getBodyModel);
  const generateFn = useServerFn(generateBodyModel);

  const { data: bodyModel = null, isLoading } = useQuery<BodyModel | null>({
    queryKey: BODY_MODEL_QUERY_KEY,
    queryFn: () => fetchFn({ data: {} }),
    staleTime: 30_000,
  });

  const generateMutation = useMutation({
    mutationFn: (input: GenerateBodyModelInput) => generateFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: BODY_MODEL_QUERY_KEY }),
    onError: (err) => toast.error(`สร้างโมเดลไม่สำเร็จ: ${(err as Error).message}`),
  });

  return {
    bodyModel,
    isLoading,
    generate: (input: GenerateBodyModelInput) => generateMutation.mutateAsync(input),
    isGenerating: generateMutation.isPending,
  };
}
