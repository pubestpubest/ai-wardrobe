import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Pencil, Plus, Search, ShoppingBag } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateItemModal } from "@/components/AffiliateItemModal";
import { AffiliateEditModal } from "@/components/AffiliateEditModal";
import { GridSkeleton } from "@/components/GridSkeleton";
import { useAffiliateProducts } from "@/hooks/use-affiliate-products";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, type AffiliateProduct } from "@/lib/wardrobe";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  ...(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
  })),
];

const norm = (s: string) => (s ?? "").replace(/\s+/g, "").toLowerCase();

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
  const { affiliateProducts, isLoading, isAdmin } = useAffiliateProducts();
  const [viewing, setViewing] = useState<AffiliateProduct | null>(null);
  const [editing, setEditing] = useState<AffiliateProduct | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = norm(search);
    return affiliateProducts.filter((p) => {
      const matchesSearch = !q || norm(p.name).includes(q) || norm(p.description ?? "").includes(q);
      const matchesCategory = category === "all" || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [affiliateProducts, search, category]);

  const hasFilters = search !== "" || category !== "all";

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
  };

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ช้อปปิ้งไอเท็ม</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading ? "กำลังโหลด…" : `${filtered.length} รายการจากร้านค้าพาร์ทเนอร์`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setAdding(true)}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Plus className="size-4" /> เพิ่มไอเท็ม
            </button>
          )}
        </header>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="size-4" />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาไอเท็ม..."
            className="pl-10 h-12 bg-white border-none shadow-sm rounded-2xl focus-visible:ring-lilac/50"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-none -mx-5 px-5 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-5 py-2.5 rounded-3xl text-sm font-semibold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                category === cat.id
                  ? "bg-lilac text-lilac-foreground shadow-lg shadow-lilac/30 -translate-y-0.5"
                  : "bg-white text-muted-foreground border border-border/40 hover:bg-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <GridSkeleton
            count={8}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          />
        ) : affiliateProducts.length > 0 ? (
          filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((p, i) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  // Stagger only when unfiltered — see wardrobe.tsx for why.
                  style={
                    { "--d": `${hasFilters ? 0 : Math.min(i, 7) * 35}ms` } as React.CSSProperties
                  }
                  onClick={() => setViewing(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setViewing(p);
                    }
                  }}
                  className="rise relative text-left bg-white rounded-2xl border border-border/40 shadow-sm p-3 flex flex-col gap-2 transition hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                >
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(p);
                      }}
                      className="absolute top-2 right-2 z-10 size-8 rounded-full bg-white/90 shadow-md flex items-center justify-center"
                      aria-label="แก้ไข"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  )}
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
                  {(p.store || p.platform) && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[p.store, p.platform].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 grayscale opacity-40">
                <ShoppingBag className="size-10" />
              </div>
              <p className="text-base font-bold text-foreground/80">ไม่พบไอเท็มที่ค้นหา</p>
              <p className="text-sm opacity-60 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองดูนะ</p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-6 px-6 py-2 bg-muted rounded-full text-xs font-bold hover:bg-border transition-colors"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          )
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
      {isAdmin && (
        <AffiliateEditModal
          product={editing}
          open={editing !== null || adding}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}
