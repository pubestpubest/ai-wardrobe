import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useStoreItems } from "@/hooks/use-store-items";
import { StoreBottomNav } from "@/components/StoreBottomNav";
import { CATEGORY_LABELS } from "@/lib/wardrobe";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/store/items")({
  component: StoreItemsPage,
  head: () => ({
    meta: [{ title: "ไอเท็ม · Digital Wardrobe" }],
  }),
});

function StoreItemsPage() {
  // getMyStoreItems returns [] both when there is no store row AND when the
  // store simply has zero items — that's ambiguous on its own, so store
  // existence is checked the same way store.package.tsx does: via useStore.
  const { store, isLoading: storeLoading, isError: storeIsError } = useStore();
  const { items, isLoading: itemsLoading, isError: itemsIsError } = useStoreItems();

  if (storeLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD] text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  // A failed fetch must NOT fall through to the no-store or empty branches —
  // same reasoning as store.package.tsx / store.index.tsx: "no data" and
  // "couldn't load" look identical otherwise (B12b-L3).
  if (storeIsError || itemsIsError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FDFCFD] px-6 text-center">
        <p className="text-sm text-muted-foreground">โหลดข้อมูลไอเท็มไม่สำเร็จ</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  // No `stores` row yet — same dead-end guard as store.package.tsx; /store is
  // the one page that renders the registration form for this state.
  if (!store) {
    return <Navigate to="/store" replace />;
  }

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">ไอเท็ม</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{items.length} รายการในร้านของคุณ</p>
        </header>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((p, i) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-border/40 shadow-sm p-3 flex flex-col gap-2"
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
                  {CATEGORY_LABELS[p.category]}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 grayscale opacity-40">
              <ShoppingBag className="size-10" />
            </div>
            <p className="text-base font-bold text-foreground/80">ยังไม่มีไอเท็มในร้าน</p>
            <p className="text-sm opacity-60 mt-1">เพิ่มไอเท็มเร็ว ๆ นี้</p>
          </div>
        )}
      </div>

      <StoreBottomNav />
    </div>
  );
}
