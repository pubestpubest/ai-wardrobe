import { useState } from "react";

export const AI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite-preview-06-17", label: "Gemini 2.5 Flash Lite" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash 8B" },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];

const STORAGE_KEY = "dev_ai_model";
const DEFAULT: AiModelId = "gemini-2.5-flash";

export function useAiModel() {
  const [model, setModelState] = useState<AiModelId>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (AI_MODELS.find((m) => m.id === stored)?.id ?? DEFAULT) as AiModelId;
    } catch {
      return DEFAULT;
    }
  });

  const setModel = (id: AiModelId) => {
    setModelState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable (e.g. private browsing)
    }
  };

  const label = AI_MODELS.find((m) => m.id === model)?.label ?? model;

  return { model, label, setModel };
}
