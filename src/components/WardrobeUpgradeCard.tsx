import { useState } from "react";
import { AffiliateItemModal } from "@/components/AffiliateItemModal";
import { wardrobeMode, type AffiliateProduct, type WardrobeItem } from "@/lib/wardrobe";

interface Props {
  items: WardrobeItem[];
  products: AffiliateProduct[];
}

export function WardrobeUpgradeCard({ items, products }: Props) {
  const [viewing, setViewing] = useState<AffiliateProduct | null>(null);

  const mode = wardrobeMode(items);

  const pickOnePerCategory = (cats: string[]) =>
    cats.map((c) => products.find((p) => p.category === c)).filter(Boolean) as AffiliateProduct[];

  let heading: string;
  let recs: AffiliateProduct[];

  if (mode === "empty") {
    heading = "เริ่มสร้างตู้ของคุณด้วยเซ็ตนี้ ✨";
    recs = pickOnePerCategory(["top", "bottom", "shoes", "outerwear", "accessory"]);
  } else if (mode === "incomplete") {
    const missing = ["top", "bottom", "shoes", "outerwear"].filter(
      (c) => !items.some((i) => i.category === c),
    );
    heading = "เติมตู้ให้ครบ 🛍️";
    recs = pickOnePerCategory(missing);
    if (recs.length === 0) {
      recs = products.filter((p) => p.category === "accessory").slice(0, 3);
    }
  } else {
    heading = "อัปเกรดลุคของคุณ 💎";
    recs = products.filter((p) => ["accessory", "outerwear"].includes(p.category)).slice(0, 4);
  }

  if (products.length === 0 || recs.length === 0) return null;

  return (
    <>
      <div className="pastel-card bg-white mb-6">
        <div className="mb-3">
          <h2 className="text-sm font-semibold">{heading}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">แนะนำจากร้านค้าพาร์ทเนอร์</p>
        </div>

        <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1">
          {recs.map((p) => (
            <button
              key={p.id}
              onClick={() => setViewing(p)}
              className="shrink-0 w-28 text-left flex flex-col gap-2 active:scale-[0.98] transition"
            >
              <div className="size-28 rounded-2xl bg-lilac flex items-center justify-center overflow-hidden">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">{p.emoji}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-xs font-semibold truncate">{p.name}</p>
                <p className="text-xs font-medium text-foreground/70">
                  {p.price.toLocaleString("th-TH")} บาท
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {p.store} · {p.platform}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AffiliateItemModal item={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
