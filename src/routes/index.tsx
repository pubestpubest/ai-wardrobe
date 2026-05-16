import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Search, Sparkles, Shirt, Heart, User, Home, Plus } from "lucide-react";
import { WardrobeCard } from "@/components/WardrobeCard";
import { StylistChat } from "@/components/StylistChat";
import { UploadItem } from "@/components/UploadItem";
import { useWardrobe } from "@/hooks/use-wardrobe";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "AI Stylist · Digital Wardrobe" },
      { name: "description", content: "ผู้ช่วยจัดชุดอัจฉริยะจากตู้เสื้อผ้าดิจิทัลของคุณ" },
    ],
  }),
});

function Index() {
  const { items, add } = useWardrobe();
  const [uploadOpen, setUploadOpen] = useState(false);
  const tones = ["lilac", "blush", "sky"] as const;
  const featured = items.slice(0, 6);

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-gradient-to-br from-lilac to-blush flex items-center justify-center text-lg">
              👗
            </div>
            <div>
              <p className="text-xs text-muted-foreground">สวัสดี,</p>
              <h1 className="text-base font-semibold leading-tight">ตู้เสื้อผ้าของฉัน</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/wardrobe" className="size-10 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Search className="size-4" />
            </Link>
            <button className="size-10 rounded-full bg-white shadow-sm flex items-center justify-center relative">
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-blush" />
            </button>
          </div>
        </header>

        {/* Hero stat card */}
        <section className="pastel-card bg-lilac text-lilac-foreground mb-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4" />
            <span className="text-sm font-medium">Outfit Today</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-bold leading-none tracking-tight">{items.length}</p>
              <p className="text-xs mt-2 opacity-70">ไอเท็มในตู้</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Tops" value={items.filter((i) => i.category === "top").length} />
              <Stat label="Bottoms" value={items.filter((i) => i.category === "bottom").length} />
              <Stat label="Shoes" value={items.filter((i) => i.category === "shoes").length} />
            </div>
          </div>
        </section>

        {/* Two-column quick cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setUploadOpen(true)}
            className="pastel-card bg-blush text-blush-foreground flex flex-col gap-3 text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">เพิ่มเสื้อผ้า</span>
              <span className="text-xl">📸</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">อัปโหลดรูป ให้ AI ช่วยกรอกข้อมูล</p>
            <span className="text-xs font-medium self-start mt-auto bg-white/60 rounded-full px-3 py-1.5 inline-flex items-center gap-1">
              <Plus className="size-3" /> อัปโหลด
            </span>
          </button>
          <div className="pastel-card bg-sky text-sky-foreground flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Daily Pick</span>
              <span className="text-xl">✨</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">ชุดแนะนำประจำวัน — ถาม AI ได้เลย</p>
            <span className="text-xs font-medium self-start mt-auto bg-white/60 rounded-full px-3 py-1.5">
              ดูชุด →
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-5">
          <StylistChat wardrobe={items} />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Link to="/wardrobe" className="text-sm font-semibold hover:text-primary transition-colors">ตู้เสื้อผ้าของฉัน</Link>
              <button
                onClick={() => setUploadOpen(true)}
                className="text-xs text-primary font-medium inline-flex items-center gap-1"
              >
                <Plus className="size-3" /> เพิ่ม
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {featured.map((it, idx) => (
                <WardrobeCard key={it.id} item={it} tone={tones[idx % 3]} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav onPlusClick={() => setUploadOpen(true)} />
      <UploadItem open={uploadOpen} onClose={() => setUploadOpen(false)} onAdd={add} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/50 rounded-xl px-3 py-2">
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="text-[10px] opacity-70 mt-1">{label}</p>
    </div>
  );
}
