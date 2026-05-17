import { useState } from "react";

export const AI_ENVS = [
  { id: "dev", label: "Dev" },
  { id: "uat", label: "UAT" },
  { id: "prod", label: "Prod" },
] as const;

export type AiEnv = (typeof AI_ENVS)[number]["id"];

const STORAGE_KEY = "dev_ai_env";
const DEFAULT: AiEnv = "prod";

export function useAiEnv() {
  const [env, setEnvState] = useState<AiEnv>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (AI_ENVS.find((e) => e.id === stored)?.id ?? DEFAULT) as AiEnv;
    } catch {
      return DEFAULT;
    }
  });

  const setEnv = (id: AiEnv) => {
    setEnvState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable (e.g. private browsing)
    }
  };

  const label = AI_ENVS.find((e) => e.id === env)?.label ?? env;

  return { env, label, setEnv };
}
