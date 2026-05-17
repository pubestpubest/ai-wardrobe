import { X, Cpu } from "lucide-react";
import { AI_MODELS, type AiModelId } from "@/hooks/use-ai-model";

export function DevTools({
  open,
  onClose,
  model,
  onModelChange,
}: {
  open: boolean;
  onClose: () => void;
  model: AiModelId;
  onModelChange: (id: AiModelId) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-background rounded-t-3xl w-full max-w-md p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Dev Tools</span>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground font-medium">AI Model</p>
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => onModelChange(m.id as AiModelId)}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm transition ${
                model === m.id
                  ? "bg-lilac text-lilac-foreground font-medium"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              <span>{m.label}</span>
              {model === m.id && (
                <span className="text-xs bg-white/30 rounded-full px-2 py-0.5">active</span>
              )}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          stored in localStorage · resets on clear
        </p>
      </div>
    </div>
  );
}
