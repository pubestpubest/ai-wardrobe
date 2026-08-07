import type { AffiliateProduct } from "@/lib/wardrobe";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

interface Props {
  item: AffiliateProduct;
  onView: () => void;
}

export function AffiliateItemCard({ item, onView }: Props) {
  const tone = TONES[item.name.length % 3];

  return (
    <div className="self-start max-w-[90%] bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-3">
        <div
          className={`size-14 shrink-0 rounded-xl ${tone} flex items-center justify-center overflow-hidden`}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">{item.emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="text-xs font-bold text-foreground/80 truncate">{item.name}</p>
          <p className="text-xs font-semibold text-foreground/70">
            {item.price.toLocaleString("th-TH")} บาท
          </p>
          {(item.store || item.platform) && (
            <p className="text-[11px] text-muted-foreground truncate">
              {[item.store, item.platform].filter(Boolean).join(" · ")}
            </p>
          )}
          {item.description && (
            <p className="text-[11px] text-foreground/60 italic line-clamp-1">{item.description}</p>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={onView}
          className="w-full h-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          ดูรายละเอียด
        </button>
      </div>
    </div>
  );
}
