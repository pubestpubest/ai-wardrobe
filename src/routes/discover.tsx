import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateItemModal } from "@/components/AffiliateItemModal";
import { useAffiliateProducts } from "@/hooks/use-affiliate-products";
import type { AffiliateProduct } from "@/lib/wardrobe";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/discover")({
  component: DiscoverPage,
  head: () => ({
    meta: [
      { title: "ช้อปปิ้ง · Digital Wardrobe" },
      { name: "description", content: "ไอเท็มแนะนำจากร้านค้าพาร์ทเนอร์" },
    ],
  }),
});

function DiscoverPage() {
  const { affiliateProducts, isLoading } = useAffiliateProducts();
  const [viewing, setViewing] = useState<AffiliateProduct | null>(null);

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ช้อปปิ้งไอเท็ม</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {affiliateProducts.length} รายการจากร้านค้าพาร์ทเนอร์
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className="py-24 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        ) : affiliateProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {affiliateProducts.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setViewing(p)}
                className="text-left bg-white rounded-2xl border border-border/40 shadow-sm p-3 flex flex-col gap-2 transition hover:shadow-md"
              >
                <div
                  className={`aspect-square rounded-xl ${TONES[i % 3]} flex items-center justify-center overflow-hidden`}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{p.emoji}</span>
                  )}
                </div>
                <p className="text-sm font-bold text-foreground/80 truncate">{p.name}</p>
                <p className="text-xs font-semibold text-foreground/70">
                  {p.price.toLocaleString("th-TH")} บาท
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {p.store} · {p.platform}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 grayscale opacity-40">
              <ShoppingBag className="size-10" />
            </div>
            <p className="text-base font-bold text-foreground/80">ยังไม่มีไอเท็มแนะนำ</p>
            <p className="text-sm opacity-60 mt-1">กลับมาเช็คใหม่เร็ว ๆ นี้</p>
          </div>
        )}
      </div>

      <BottomNav />
      <AffiliateItemModal item={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
