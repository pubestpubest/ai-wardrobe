import type { StoredItem } from "@/hooks/use-wardrobe";

const TONE = {
  lilac: "bg-lilac text-lilac-foreground",
  blush: "bg-blush text-blush-foreground",
  sky: "bg-sky text-sky-foreground",
} as const;

export function WardrobeCard({ item, tone }: { item: StoredItem; tone: keyof typeof TONE }) {
  return (
    <div className="group cursor-pointer">
      <div className={`aspect-[4/5] rounded-[2rem] ${TONE[tone]} flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-[1.02] overflow-hidden relative shadow-sm`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-5xl transition-transform duration-500 group-hover:scale-110">{item.emoji}</div>
        )}
        <div className="absolute top-4 right-4 px-2 py-1 bg-white/40 backdrop-blur-md rounded-full border border-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
           <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{item.category}</span>
        </div>
      </div>
      <div className="px-1">
        <p className="text-sm font-bold leading-tight text-foreground/90">{item.name}</p>
        <p className="text-[11px] font-medium text-muted-foreground mt-1 capitalize">{item.formality.replace("-", " ")}</p>
      </div>
    </div>
  );
}
