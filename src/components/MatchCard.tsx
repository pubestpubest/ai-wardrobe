import { Sparkles } from "lucide-react";
import type { Match, WardrobeItem } from "@/lib/wardrobe";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

interface Props {
  match: Match;
  items: WardrobeItem[];
  onClick?: () => void;
}

export function MatchCard({ match, items, onClick }: Props) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = match.itemIds.map((id) => byId.get(id)).filter(Boolean) as WardrobeItem[];

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white rounded-3xl border border-border/40 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition group"
    >
      <div className="grid grid-cols-3 gap-1 p-3 bg-muted/30">
        {resolved.slice(0, 6).map((item, idx) => (
          <div
            key={item.id}
            className={`aspect-square rounded-2xl ${TONES[idx % 3]} flex items-center justify-center overflow-hidden`}
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">{item.emoji}</span>
            )}
          </div>
        ))}
        {resolved.length === 0 && (
          <div className="col-span-3 aspect-[3/1] flex items-center justify-center text-xs text-muted-foreground">
            ไอเท็มถูกลบไปแล้ว
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1.5">
          {match.source === "ai" && (
            <Sparkles className="size-3.5 text-lilac-foreground/70 shrink-0" />
          )}
          <p className="text-sm font-bold leading-tight text-foreground/90 truncate">
            {match.name}
          </p>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground mt-1">
          {resolved.length} ไอเท็ม{match.occasion ? ` · ${match.occasion}` : ""}
        </p>
        {match.reason && (
          <p className="text-[11px] text-muted-foreground/80 mt-2 line-clamp-2 italic">
            {match.reason}
          </p>
        )}
        {match.note && (
          <p className="text-[11px] text-foreground/70 mt-1 line-clamp-2">{match.note}</p>
        )}
      </div>
    </button>
  );
}
