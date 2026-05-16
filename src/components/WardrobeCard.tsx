import type { StoredItem } from "@/hooks/use-wardrobe";

const TONE = {
  lilac: "bg-lilac text-lilac-foreground",
  blush: "bg-blush text-blush-foreground",
  sky: "bg-sky text-sky-foreground",
} as const;

export function WardrobeCard({ item, tone }: { item: StoredItem; tone: keyof typeof TONE }) {
  return (
    <div className={`pastel-card ${TONE[tone]} flex flex-col gap-2`}>
      <div className="flex items-start justify-between">
        {item.imageUrl ? (
          <div className="size-12 rounded-xl overflow-hidden bg-white/40">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="text-3xl">{item.emoji}</div>
        )}
        <span className="text-[10px] uppercase tracking-wider opacity-70">{item.category}</span>
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight">{item.name}</p>
        <p className="text-xs opacity-70 mt-0.5">{item.color} · {item.formality}</p>
      </div>
    </div>
  );
}
