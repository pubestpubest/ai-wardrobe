import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Plus, Sparkles, X } from "lucide-react";
import { WardrobeCard } from "@/components/WardrobeCard";
import { BottomNav } from "@/components/BottomNav";
import { UploadItem } from "@/components/UploadItem";
import { StoredItem, useWardrobe } from "@/hooks/use-wardrobe";
import { Input } from "@/components/ui/input";
import { EditItem } from "@/components/EditItem";
import { SaveMatchModal } from "@/components/SaveMatchModal";
import { useMatches } from "@/hooks/use-matches";
import { CATEGORY_LABELS } from "@/lib/wardrobe";

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
  { id: "all", label: "ทั้งหมด" },
  ...(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
  })),
];

function WardrobePage() {
  const { items, add, update, remove } = useWardrobe();
  const { add: addMatch } = useMatches();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveOpen, setSaveOpen] = useState(false);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.color.toLowerCase().includes(search.toLowerCase()) ||
        item.style.some((s) => s.toLowerCase().includes(search.toLowerCase())) ||
        (item.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, selectedCategory]);

  const tones = ["lilac", "blush", "sky"] as const;

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {selectMode ? "เลือกไอเท็ม" : "เสื้อผ้าของฉัน"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectMode ? `${selectedIds.size} ชิ้นที่เลือก` : `${items.length} ไอเท็ม`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectMode ? (
              <button
                onClick={exitSelectMode}
                className="size-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-border/40 hover:bg-muted transition-colors"
                aria-label="ยกเลิก"
              >
                <X className="size-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setSelectMode(true)}
                  className="h-10 px-4 rounded-full bg-white shadow-sm flex items-center gap-1.5 border border-border/40 hover:bg-muted transition-colors text-xs font-semibold"
                >
                  <Sparkles className="size-4" /> สร้างแมตช์
                </button>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="size-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-border/40 hover:bg-muted transition-colors"
                >
                  <Plus className="size-5" />
                </button>
              </>
            )}
          </div>
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
                  selectable={selectMode}
                  selected={selectedIds.has(item.id)}
                  onClick={() => (selectMode ? toggleSelected(item.id) : setEditing(item))}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 text-4xl grayscale opacity-40">
                👚
              </div>
              <p className="text-base font-bold text-foreground/80">
                {search || selectedCategory !== "all"
                  ? "ไม่พบเสื้อผ้าที่ค้นหา"
                  : "ยังไม่มีเสื้อผ้าในตู้"}
              </p>
              <p className="text-sm opacity-60 mt-1">
                {search || selectedCategory !== "all"
                  ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองดูนะ"
                  : "เพิ่มเสื้อผ้าชิ้นแรกกันเลย!"}
              </p>
              {search || selectedCategory !== "all" ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                  }}
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

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 bg-background rounded-full border border-border px-2 py-2 shadow-lg flex items-center gap-2 glass">
          <span className="px-3 text-xs font-semibold">{selectedIds.size} ชิ้น</span>
          <button
            onClick={exitSelectMode}
            className="px-4 h-9 rounded-full bg-muted text-xs font-semibold hover:bg-border transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => setSaveOpen(true)}
            disabled={selectedIds.size < 1}
            className="px-4 h-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Sparkles className="size-3.5" /> บันทึกแมตช์
          </button>
        </div>
      )}

      <BottomNav onUpload={() => setUploadOpen(true)} />
      <UploadItem open={uploadOpen} onClose={() => setUploadOpen(false)} onAdd={add} />
      <EditItem item={editing} onClose={() => setEditing(null)} onSave={update} onDelete={remove} />
      <SaveMatchModal
        open={saveOpen}
        items={selectedItems}
        onClose={() => setSaveOpen(false)}
        onSave={async (m) => {
          await addMatch(m);
          toast.success("บันทึกแมตช์แล้ว");
          setSaveOpen(false);
          exitSelectMode();
        }}
      />
    </div>
  );
}
