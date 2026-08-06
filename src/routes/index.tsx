import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Sparkles, Plus } from "lucide-react";
import { WardrobeCard } from "@/components/WardrobeCard";
import { StylistChat, type StylistChatHandle } from "@/components/StylistChat";
import { UploadItem } from "@/components/UploadItem";
import { BottomNav } from "@/components/BottomNav";
import { DevTools } from "@/components/DevTools";
import { StoredItem, useWardrobe } from "@/hooks/use-wardrobe";
import { useAiEnv, type AiEnv } from "@/hooks/use-ai-env";
import { useProfile } from "@/hooks/use-profile";
import { EditItem } from "@/components/EditItem";
import { WardrobeUpgradeCard } from "@/components/WardrobeUpgradeCard";
import { WeatherCard } from "@/components/WeatherCard";
import { useAffiliateProducts } from "@/hooks/use-affiliate-products";
import { pickRandomOutfit } from "@/lib/daily-pick";

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
  const { items, add, update, remove } = useWardrobe();
  const { affiliateProducts } = useAffiliateProducts();
  const { profile } = useProfile();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
  const { env, setEnv } = useAiEnv();
  const tones = ["lilac", "blush", "sky"] as const;
  const featured = items.slice(0, 6);
  const [editing, setEditing] = useState<StoredItem | null>(null);
  const chatRef = useRef<StylistChatHandle>(null);
  const chatWrapRef = useRef<HTMLDivElement>(null);

  const handleDailyPick = useCallback(() => {
    const pick = pickRandomOutfit(items);
    if (!pick) {
      toast.error("ยังมีไอเท็มไม่พอจัดชุด ลองเพิ่มเสื้อผ้าก่อนนะคะ");
      return;
    }
    chatRef.current?.injectDaily(pick);
    requestAnimationFrame(() => {
      chatWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [items]);

  const tapCount = useState(0);
  const handleLogoTap = useCallback(() => {
    tapCount[1]((n) => {
      const next = n + 1;
      if (next >= 5) {
        setDevOpen(true);
        return 0;
      }
      return next;
    });
  }, [tapCount]);

  return (
    <div className="min-h-screen pb-28">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="size-11 rounded-full overflow-hidden bg-gradient-to-br from-lilac to-blush flex items-center justify-center text-lg font-bold text-lilac-foreground shrink-0 hover:opacity-90 transition"
              aria-label="ไปหน้าโปรไฟล์"
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                (profile.name[0] ?? "👗")
              )}
            </Link>
            <button onClick={handleLogoTap} className="text-left select-none">
              <p className="text-xs text-muted-foreground">สวัสดี,</p>
              <h1 className="text-base font-semibold leading-tight">{profile.name} ✨</h1>
            </button>
          </div>
        </header>

        <WeatherCard />

        {/* Hero stat card */}
        <Link
          to="/wardrobe"
          className="pastel-card bg-lilac text-lilac-foreground mb-4 relative overflow-hidden block hover:shadow-md active:scale-[0.99] transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4" />
              <span className="text-sm font-medium">ชุดวันนี้</span>
            </div>
            <span className="text-sm font-semibold bg-white/60 rounded-full px-4 py-2">
              ดูตู้ทั้งหมด →
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-bold leading-none tracking-tight">{items.length}</p>
              <p className="text-xs mt-2 opacity-70">ไอเท็มในตู้</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="เสื้อ" value={items.filter((i) => i.category === "top").length} />
              <Stat label="กางเกง" value={items.filter((i) => i.category === "bottom").length} />
              <Stat label="รองเท้า" value={items.filter((i) => i.category === "shoes").length} />
            </div>
          </div>
        </Link>

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
          <button
            onClick={handleDailyPick}
            className="pastel-card bg-sky text-sky-foreground flex flex-col gap-3 text-left active:scale-[0.98] transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Daily Pick</span>
              <span className="text-xl">✨</span>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">
              สุ่มชุดวันนี้จากตู้ของคุณ — ไม่ใช้โควต้า AI
            </p>
            <span className="text-xs font-medium self-start mt-auto bg-white/60 rounded-full px-3 py-1.5 inline-flex items-center gap-1">
              <Sparkles className="size-3" /> ดูชุดวันนี้
            </span>
          </button>
        </div>

        <WardrobeUpgradeCard items={items} products={affiliateProducts} />

        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-5" ref={chatWrapRef}>
          <StylistChat ref={chatRef} wardrobe={items} env={env} />

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">ตู้เสื้อผ้าของฉัน</h2>
              <button
                onClick={() => setUploadOpen(true)}
                className="text-xs text-primary font-medium inline-flex items-center gap-1"
              >
                <Plus className="size-3" /> เพิ่ม
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {featured.map((it, idx) => (
                <WardrobeCard
                  key={it.id}
                  item={it}
                  tone={tones[idx % 3]}
                  onClick={() => setEditing(it)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <BottomNav onUpload={() => setUploadOpen(true)} />

      <UploadItem open={uploadOpen} onClose={() => setUploadOpen(false)} onAdd={add} env={env} />
      <EditItem item={editing} onClose={() => setEditing(null)} onSave={update} onDelete={remove} />

      <DevTools
        open={devOpen}
        onClose={() => setDevOpen(false)}
        env={env as AiEnv}
        onEnvChange={setEnv}
      />
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
