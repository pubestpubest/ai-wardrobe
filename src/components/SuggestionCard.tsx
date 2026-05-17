import { useState } from "react";
import { Sparkles, Heart, X } from "lucide-react";
import type { MatchSuggestion, WardrobeItem } from "@/lib/wardrobe";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

interface Props {
  suggestion: MatchSuggestion;
  items: WardrobeItem[];
  onSave: (s: MatchSuggestion) => Promise<unknown>;
  onDismiss: () => void;
}

export function SuggestionCard({ suggestion, items, onSave, onDismiss }: Props) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = suggestion.itemIds.map((id) => byId.get(id)).filter(Boolean) as WardrobeItem[];

  const handleSave = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      await onSave(suggestion);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="self-start max-w-[90%] bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-lilac-foreground/70" />
        <p className="text-xs font-bold text-foreground/80">{suggestion.name}</p>
        {suggestion.occasion && (
          <span className="text-[10px] text-muted-foreground">· {suggestion.occasion}</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 px-3">
        {resolved.slice(0, 8).map((item, idx) => (
          <div
            key={item.id}
            className={`aspect-square rounded-xl ${TONES[idx % 3]} flex items-center justify-center overflow-hidden`}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{item.emoji}</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-foreground/70 leading-relaxed px-4 pt-2.5 italic">
        {suggestion.reason}
      </p>

      <div className="flex gap-1.5 p-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex-1 h-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          <Heart className="size-3.5" />
          {saved ? "บันทึกแล้ว" : saving ? "กำลังบันทึก..." : "บันทึกเข้าโปรด"}
        </button>
        {!saved && (
          <button
            onClick={onDismiss}
            className="size-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-border transition"
            aria-label="ปิดการ์ดแนะนำ"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
