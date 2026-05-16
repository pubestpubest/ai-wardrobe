import type { WardrobeItem } from "@/lib/wardrobe";
import { CATEGORY_LABELS } from "@/lib/wardrobe";

const TONE_BG = {
  lilac: "from-lilac/60 to-lilac/20",
  blush: "from-blush/60 to-blush/20",
  sky: "from-sky/60 to-sky/20",
} as const;

interface Props {
  item: WardrobeItem;
  tone: keyof typeof TONE_BG;
  onClick?: () => void;
  compact?: boolean;
}

export function WardrobeCard({ item, tone, onClick, compact = false }: Props) {
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-muted text-left w-full transition-transform active:scale-95 ${compact ? "aspect-square" : "aspect-[3/4]"}`}
    >
      {/* Photo or emoji fallback */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${TONE_BG[tone]}`}>
          <span className="text-5xl">{item.emoji}</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
        <span className="text-[10px] font-medium bg-white/80 backdrop-blur-sm rounded-full px-2 py-0.5 text-foreground leading-none">
          {CATEGORY_LABELS[item.category]}
        </span>
        {(item.wearCount ?? 0) > 0 && (
          <span className="text-[10px] bg-white/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-foreground leading-none">
            ×{item.wearCount}
          </span>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-sm font-semibold leading-tight drop-shadow line-clamp-1">
          {item.name}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-white/80 text-[10px] drop-shadow">{item.color}</span>
          {item.style.slice(0, 2).map((s) => (
            <span
              key={s}
              className="text-[9px] bg-white/20 backdrop-blur-sm text-white rounded-full px-1.5 py-0.5"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
