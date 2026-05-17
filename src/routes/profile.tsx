import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { Sparkles, Shirt, Heart, ChevronRight, Bell, Globe, Palette, LogOut } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useWardrobe } from "@/hooks/use-wardrobe";
import { useMatches } from "@/hooks/use-matches";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [{ title: "โปรไฟล์ · Digital Wardrobe" }],
  }),
});

const MOCK_USER = {
  name: "พุเบสต์",
  handle: "@pubest",
  email: "pubestpubest@gmail.com",
  joined: "เข้าร่วมเมื่อ พฤษภาคม 2026",
  favoriteStyle: "Minimal · Pastel",
  bio: "ชอบสไตล์มินิมอลโทนพาสเทล ❀",
};

function ProfilePage() {
  const { items } = useWardrobe();
  const { matches } = useMatches();

  const aiMatchCount = useMemo(() => matches.filter((m) => m.source === "ai").length, [matches]);

  const soon = () => toast.info("ฟีเจอร์นี้กำลังจะมาเร็ว ๆ นี้");

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">โปรไฟล์</h1>
        </header>

        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 flex items-center gap-4 mb-5">
          <div className="size-16 rounded-full bg-lilac text-lilac-foreground flex items-center justify-center text-2xl font-bold shrink-0">
            {MOCK_USER.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-foreground/90 truncate">{MOCK_USER.name}</p>
            <p className="text-xs text-muted-foreground truncate">{MOCK_USER.handle}</p>
            <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">{MOCK_USER.email}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-blush/40 rounded-3xl px-5 py-4 mb-5 flex items-center gap-3 border border-blush/60">
          <Sparkles className="size-4 text-blush-foreground/70 shrink-0" />
          <p className="text-sm text-foreground/80">{MOCK_USER.bio}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={<Shirt className="size-4" />}
            tone="bg-sky text-sky-foreground"
            value={items.length}
            label="ไอเท็ม"
          />
          <StatCard
            icon={<Heart className="size-4" />}
            tone="bg-blush text-blush-foreground"
            value={matches.length}
            label="แมตช์"
          />
          <StatCard
            icon={<Sparkles className="size-4" />}
            tone="bg-lilac text-lilac-foreground"
            value={aiMatchCount}
            label="จาก AI"
          />
        </div>

        {/* Favorite style */}
        <Section title="สไตล์ที่ชอบ">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-border/40">
            <div>
              <p className="text-xs text-muted-foreground">สไตล์โปรด</p>
              <p className="text-sm font-semibold mt-0.5">{MOCK_USER.favoriteStyle}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{MOCK_USER.joined}</span>
          </div>
        </Section>

        {/* Settings list */}
        <Section title="การตั้งค่า">
          <SettingRow icon={<Bell className="size-4" />} label="การแจ้งเตือน" onClick={soon} />
          <SettingRow icon={<Palette className="size-4" />} label="ธีมและสีหลัก" onClick={soon} />
          <SettingRow icon={<Globe className="size-4" />} label="ภาษา" hint="ไทย" onClick={soon} />
        </Section>

        <button
          onClick={soon}
          className="w-full mt-5 flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-2xl py-3 text-sm font-semibold hover:bg-destructive/15 transition"
        >
          <LogOut className="size-4" /> ออกจากระบบ
        </button>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Digital Wardrobe · v0.1 · ข้อมูลทดสอบ
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

function StatCard({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/40 shadow-sm px-3 py-4 flex flex-col items-center gap-1.5">
      <div className={`size-9 rounded-full ${tone} flex items-center justify-center`}>{icon}</div>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2 px-1">
        {title}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function SettingRow({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white border border-border/40 hover:bg-muted/40 transition text-left"
    >
      <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  );
}
