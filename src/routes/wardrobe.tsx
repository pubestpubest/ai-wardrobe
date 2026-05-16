import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, ArrowLeft, SlidersHorizontal, Search, X } from "lucide-react";
import { WardrobeCard } from "@/components/WardrobeCard";
import { ItemDetail } from "@/components/ItemDetail";
import { UploadItem } from "@/components/UploadItem";
import { BottomNav } from "@/components/BottomNav";
import { useWardrobe } from "@/hooks/use-wardrobe";
import type { WardrobeItem } from "@/lib/wardrobe";
import { CATEGORY_LABELS } from "@/lib/wardrobe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/wardrobe")({
  component: WardrobePage,
  head: () => ({ meta: [{ title: "ตู้เสื้อผ้า · Digital Wardrobe" }] }),
});

type Category = WardrobeItem["category"] | "all";
type SortKey = "newest" | "most-worn" | "name";

const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: "all", label: "ทั้งหมด", emoji: "✨" },
  { key: "top", label: "เสื้อ", emoji: "👚" },
  { key: "bottom", label: "กางเกง", emoji: "👖" },
  { key: "dress", label: "เดรส", emoji: "👗" },
  { key: "outerwear", label: "คลุม", emoji: "🧥" },
  { key: "shoes", label: "รองเท้า", emoji: "👟" },
  { key: "accessory", label: "อุปกรณ์", emoji: "👜" },
];

const TONES = ["lilac", "blush", "sky"] as const;

function WardrobePage() {
  const { items, isLoading, add, remove, markWorn } = useWardrobe();
  const [selected, setSelected] = useState<WardrobeItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [filter, setFilter] = useState<Category>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filtered = useMemo(() => {
    let list = filter === "all" ? items : items.filter((i) => i.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.color.toLowerCase().includes(q) ||
          i.style.some((s) => s.toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "most-worn") return (b.wearCount ?? 0) - (a.wearCount ?? 0);
      if (sort === "name") return a.name.localeCompare(b.name, "th");
      return 0; // newest = DB order (already sorted by created_at desc)
    });
  }, [items, filter, search, sort]);

  // Stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1;
    return counts;
  }, [items]);

  const totalWorn = items.reduce((s, i) => s + (i.wearCount ?? 0), 0);

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="mx-auto max-w-2xl px-4">
          {/* Title row */}
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="size-9 rounded-full bg-muted flex items-center justify-center"
              >
                <ArrowLeft className="size-4" />
              </Link>
              {!showSearch && (
                <div>
                  <h1 className="text-base font-bold">ตู้เสื้อผ้าของฉัน</h1>
                  <p className="text-[11px] text-muted-foreground">{items.length} ไอเท็ม · สวมใส่รวม {totalWorn} ครั้ง</p>
                </div>
              )}
              {showSearch && (
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาเสื้อผ้า..."
                  className="bg-muted rounded-full px-4 py-2 text-sm outline-none w-48"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowSearch((v) => !v); setSearch(""); }}
                className="size-9 rounded-full bg-muted flex items-center justify-center"
              >
                {showSearch ? <X className="size-4" /> : <Search className="size-4" />}
              </button>
              <button
                onClick={() => setUploadOpen(true)}
                className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4 flex flex-col gap-4">
        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "เสื้อ", count: stats["top"] ?? 0, bg: "bg-lilac/50" },
            { label: "กางเกง", count: stats["bottom"] ?? 0, bg: "bg-blush/50" },
            { label: "รองเท้า", count: stats["shoes"] ?? 0, bg: "bg-sky/50" },
            { label: "อื่นๆ", count: (stats["dress"] ?? 0) + (stats["outerwear"] ?? 0) + (stats["accessory"] ?? 0), bg: "bg-muted" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl px-3 py-2.5 text-center`}>
              <p className="text-lg font-bold leading-none">{s.count}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter + Sort row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = filter === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setFilter(cat.key)}
                  className={`flex-none flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                  {cat.key !== "all" && (stats[cat.key] ?? 0) > 0 && (
                    <span className={`${active ? "bg-white/30" : "bg-background"} rounded-full text-[10px] px-1.5 py-0.5`}>
                      {stats[cat.key]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() =>
              setSort((s) => s === "newest" ? "most-worn" : s === "most-worn" ? "name" : "newest")
            }
            className="flex-none size-9 rounded-full bg-muted flex items-center justify-center relative"
            title={sort}
          >
            <SlidersHorizontal className="size-4" />
            {sort !== "newest" && (
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Sort label */}
        {sort !== "newest" && (
          <p className="text-[11px] text-muted-foreground -mt-2">
            เรียงโดย: {sort === "most-worn" ? "ใส่บ่อยสุด" : "ชื่อ ก-ฮ"}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="size-20 rounded-full bg-lilac/40 flex items-center justify-center text-4xl">
              {filter === "all" ? "👗" : CATEGORIES.find((c) => c.key === filter)?.emoji}
            </div>
            <div className="text-center">
              <p className="font-semibold">ยังไม่มีเสื้อผ้าในตู้</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? `ไม่พบ "${search}"` : "เพิ่มเสื้อผ้าชิ้นแรกกันเลย!"}
              </p>
            </div>
            {!search && (
              <button
                onClick={() => setUploadOpen(true)}
                className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium flex items-center gap-2"
              >
                <Plus className="size-4" /> เพิ่มเสื้อผ้า
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item, idx) => (
              <WardrobeCard
                key={item.id}
                item={item}
                tone={TONES[idx % 3]}
                onClick={() => setSelected(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Item detail sheet */}
      <ItemDetail
        item={selected}
        onClose={() => setSelected(null)}
        onDelete={(id, imageUrl) => { remove(id, imageUrl); setSelected(null); }}
        onWear={(id) => { markWorn(id); setSelected(null); }}
      />

      {/* Upload modal */}
      <UploadItem open={uploadOpen} onClose={() => setUploadOpen(false)} onAdd={add} />

      <BottomNav onUpload={() => setUploadOpen(true)} />
    </div>
  );
}
