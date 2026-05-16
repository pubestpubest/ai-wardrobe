import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Plus, Filter, SlidersHorizontal } from "lucide-react";
import { WardrobeCard } from "@/components/WardrobeCard";
import { BottomNav } from "@/components/BottomNav";
import { UploadItem } from "@/components/UploadItem";
import { useWardrobe } from "@/hooks/use-wardrobe";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/wardrobe")({
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

function WardrobePage() {
  const { items, add } = useWardrobe();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.color.toLowerCase().includes(search.toLowerCase());
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
          <h1 className="text-2xl font-bold text-foreground">เสื้อผ้าของฉัน</h1>
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
          <button className="absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center bg-muted rounded-lg text-muted-foreground">
            <SlidersHorizontal className="size-4" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar -mx-5 px-5 mb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-7 py-3 rounded-3xl text-sm font-bold whitespace-nowrap transition-all duration-500 transform active:scale-95 ${
                selectedCategory === cat.id
                  ? "bg-lilac text-lilac-foreground shadow-xl shadow-lilac/30 -translate-y-0.5"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {filteredItems.map((item, idx) => (
                <WardrobeCard 
                  key={item.id} 
                  item={item} 
                  tone={tones[idx % 3]} 
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground animate-in zoom-in-95 duration-500">
              <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 text-4xl grayscale opacity-40">
                👚
              </div>
              <p className="text-base font-bold text-foreground/80">ไม่พบเสื้อผ้าที่ค้นหา</p>
              <p className="text-sm opacity-60 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองดูนะ</p>
              <button 
                onClick={() => {setSearch(""); setSelectedCategory("all");}}
                className="mt-6 px-6 py-2 bg-muted rounded-full text-xs font-bold hover:bg-border transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav onPlusClick={() => setUploadOpen(true)} />
      <UploadItem open={uploadOpen} onClose={() => setUploadOpen(false)} onAdd={add} />
    </div>
  );
}

import { Shirt } from "lucide-react";
