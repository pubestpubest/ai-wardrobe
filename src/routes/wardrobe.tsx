import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { WardrobeCard } from "@/components/WardrobeCard";
import { BottomNav } from "@/components/BottomNav";
import { UploadItem } from "@/components/UploadItem";
import { useWardrobe } from "@/hooks/use-wardrobe";
import { Input } from "@/components/ui/input";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/wardrobe")({
  component: WardrobePage,
  head: () => ({
    meta: [
      { title: "ตู้เสื้อผ้าของฉัน · Digital Wardrobe" },
      { name: "description", content: "ดูเสื้อผ้าทั้งหมดและจัดการตู้เสื้อผ้าของคุณ" },
    ],
  }),
});

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "top", label: "Tops" },
  { id: "bottom", label: "Bottoms" },
  { id: "shoes", label: "Shoes" },
  { id: "outerwear", label: "Outerwear" },
  { id: "dress", label: "Dresses" },
  { id: "accessory", label: "Accessories" },
];

type SortKey = "newest" | "most-worn" | "name";

function WardrobePage() {
  const { items, add } = useWardrobe();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [uploadOpen, setUploadOpen] = useState(false);

  const filteredItems = useMemo(() => {
    let list = items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.color.toLowerCase().includes(search.toLowerCase()) ||
        item.style.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    return [...list].sort((a, b) => {
      if (sort === "most-worn") return (b.wearCount ?? 0) - (a.wearCount ?? 0);
      if (sort === "name") return a.name.localeCompare(b.name, "th");
      return 0;
    });
  }, [items, search, selectedCategory, sort]);

  const tones = ["lilac", "blush", "sky"] as const;

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">เสื้อผ้าของฉัน</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{items.length} ไอเท็ม</p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="size-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-border/40 hover:bg-muted transition-colors"
          >
            <Plus className="size-5" />
          </button>
        </header>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="size-4" />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเสื้อผ้า..."
            className="pl-10 h-12 bg-white border-none shadow-sm rounded-2xl focus-visible:ring-lilac/50"
          />
          <button
            onClick={() =>
              setSort((s) => (s === "newest" ? "most-worn" : s === "most-worn" ? "name" : "newest"))
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center bg-muted rounded-lg text-muted-foreground"
            title={sort}
          >
            <span className="relative flex items-center justify-center">
              <SlidersHorizontal className="size-4" />
              {sort !== "newest" && (
                <span className="absolute -top-1 -right-1 size-1.5 rounded-full bg-primary" />
              )}
            </span>
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-none -mx-5 px-5 mb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-5 py-2.5 rounded-3xl text-sm font-semibold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                selectedCategory === cat.id
                  ? "bg-lilac text-lilac-foreground shadow-lg shadow-lilac/30 -translate-y-0.5"
                  : "bg-white text-muted-foreground border border-border/40 hover:bg-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="min-h-[50vh]">
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
              {filteredItems.map((item, idx) => (
                <WardrobeCard
                  key={item.id}
                  item={item}
                  tone={tones[idx % 3]}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 text-4xl grayscale opacity-40">
                👚
              </div>
              <p className="text-base font-bold text-foreground/80">
                {search || selectedCategory !== "all" ? "ไม่พบเสื้อผ้าที่ค้นหา" : "ยังไม่มีเสื้อผ้าในตู้"}
              </p>
              <p className="text-sm opacity-60 mt-1">
                {search || selectedCategory !== "all"
                  ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองดูนะ"
                  : "เพิ่มเสื้อผ้าชิ้นแรกกันเลย!"}
              </p>
              {(search || selectedCategory !== "all") ? (
                <button
                  onClick={() => { setSearch(""); setSelectedCategory("all"); }}
                  className="mt-6 px-6 py-2 bg-muted rounded-full text-xs font-bold hover:bg-border transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              ) : (
                <button
                  onClick={() => setUploadOpen(true)}
                  className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold flex items-center gap-2"
                >
                  <Plus className="size-4" /> เพิ่มเสื้อผ้า
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav onUpload={() => setUploadOpen(true)} />
      <UploadItem open={uploadOpen} onClose={() => setUploadOpen(false)} onAdd={add} />
    </div>
  );
}
