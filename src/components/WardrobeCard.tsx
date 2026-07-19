import { Check } from "lucide-react";
import type { WardrobeItem } from "@/lib/wardrobe";

const TONE = {
  lilac: "bg-lilac text-lilac-foreground",
  blush: "bg-blush text-blush-foreground",
  sky: "bg-sky text-sky-foreground",
} as const;

interface Props {
  item: WardrobeItem;
  tone: keyof typeof TONE;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

export function WardrobeCard({ item, tone, onClick, selectable, selected }: Props) {
  const tags = item.tags ?? [];
  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div
        className={`aspect-[4/5] rounded-[2rem] ${TONE[tone]} flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-[1.02] overflow-hidden relative shadow-sm ${
          selectable && selected ? "ring-4 ring-primary ring-offset-2 ring-offset-background" : ""
        } ${selectable && !selected ? "opacity-80" : ""}`}
      >
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-5xl transition-transform duration-500 group-hover:scale-110">
            {item.emoji}
          </div>
        )}
        {selectable && (
          <div
            className={`absolute top-4 left-4 size-7 rounded-full flex items-center justify-center transition ${
              selected
                ? "bg-primary text-primary-foreground"
                : "bg-white/70 backdrop-blur-md border border-white/60"
            }`}
          >
            {selected && <Check className="size-4" />}
          </div>
        )}
        {!selectable && (
          <div className="absolute top-4 right-4 px-2 py-1 bg-white/40 backdrop-blur-md rounded-full border border-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">
              {item.category}
            </span>
          </div>
        )}
        {!selectable && (item.wearCount ?? 0) > 0 && (
          <div className="absolute top-4 left-4 px-2 py-1 bg-white/40 backdrop-blur-md rounded-full border border-white/40">
            <span className="text-[10px] font-bold text-foreground/70">×{item.wearCount}</span>
          </div>
        )}
        {tags.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
            {tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="text-[9px] font-semibold bg-white/75 backdrop-blur-sm text-foreground/80 rounded-full px-2 py-0.5 shadow-sm"
              >
                {t}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[9px] font-semibold bg-white/75 backdrop-blur-sm text-foreground/80 rounded-full px-2 py-0.5 shadow-sm">
                +{tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-1">
        <p className="text-sm font-bold leading-tight text-foreground/90">{item.name}</p>
        <p className="text-[11px] font-medium text-muted-foreground mt-1 capitalize">
          {item.formality.replace("-", " ")} · {item.color}
        </p>
      </div>
    </div>
  );
}
