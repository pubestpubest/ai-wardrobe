import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAiUsage } from "@/lib/ai-usage.functions";
import { AI_LIMITS } from "@/lib/wardrobe";
import { useAuth } from "@/hooks/use-auth";

export function useAiUsage() {
  const { session } = useAuth();
  const fetchFn = useServerFn(getAiUsage);

  const { data } = useQuery({
    queryKey: ["ai-usage", session?.user?.id],
    queryFn: () => fetchFn({ data: {} }),
    enabled: !!session,
    staleTime: 30_000,
  });

  const used = { chat: data?.chat ?? 0, analyze: data?.analyze ?? 0 };
  return {
    chat: {
      used: used.chat,
      remaining: Math.max(0, AI_LIMITS.chat - used.chat),
      limit: AI_LIMITS.chat,
    },
    analyze: {
      used: used.analyze,
      remaining: Math.max(0, AI_LIMITS.analyze - used.analyze),
      limit: AI_LIMITS.analyze,
    },
  };
}
