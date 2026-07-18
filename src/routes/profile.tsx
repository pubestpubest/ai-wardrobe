import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  Shirt,
  Heart,
  ChevronRight,
  Bell,
  Globe,
  Palette,
  LogOut,
  Pencil,
  ScanFace,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { EditProfileModal } from "@/components/EditProfileModal";
import { useWardrobe } from "@/hooks/use-wardrobe";
import { useMatches } from "@/hooks/use-matches";
import { useProfile } from "@/hooks/use-profile";
import { useBodyModel } from "@/hooks/use-body-model";
import { useAuth } from "@/hooks/use-auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [{ title: "โปรไฟล์ · Digital Wardrobe" }],
  }),
});

const JOINED_LABEL = "เข้าร่วมเมื่อ พฤษภาคม 2026";

const GENDER_LABEL: Record<string, string> = {
  male: "ชาย",
  female: "หญิง",
  other: "อื่น ๆ",
};

function ProfilePage() {
  const { items } = useWardrobe();
  const { matches } = useMatches();
  const { profile, update } = useProfile();
  const { bodyModel } = useBodyModel();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const aiMatchCount = useMemo(() => matches.filter((m) => m.source === "ai").length, [matches]);

  const soon = () => toast.info("ฟีเจอร์นี้กำลังจะมาเร็ว ๆ นี้");

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem("wardrobe.chat");
    localStorage.removeItem("wardrobe.profile");
    queryClient.clear();
  };

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">โปรไฟล์</h1>
          <button
            onClick={() => setEditOpen(true)}
            className="h-10 px-4 rounded-full bg-white shadow-sm flex items-center gap-1.5 border border-border/40 hover:bg-muted transition text-xs font-semibold"
          >
            <Pencil className="size-3.5" /> แก้ไข
          </button>
        </header>

        {/* Profile card */}
        <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 flex items-center gap-4 mb-5">
          <div className="size-16 rounded-full overflow-hidden bg-lilac text-lilac-foreground flex items-center justify-center text-2xl font-bold shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              (profile.name[0] ?? "?")
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-foreground/90 truncate">{profile.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.handle}</p>
            <p className="text-[11px] text-muted-foreground/80 mt-1 truncate">{profile.email}</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="bg-blush/40 rounded-3xl px-5 py-4 mb-5 flex items-center gap-3 border border-blush/60">
            <Sparkles className="size-4 text-blush-foreground/70 shrink-0" />
            <p className="text-sm text-foreground/80">{profile.bio}</p>
          </div>
        )}

        {/* Virtual Model */}
        <div className="rounded-3xl p-4 mb-5 flex items-center gap-3 border-2 border-lilac/60 bg-gradient-to-r from-lilac/10 via-blush/10 to-sky/10">
          <div className="size-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
            {bodyModel?.avatarImageUrl ? (
              <img
                src={bodyModel.avatarImageUrl}
                alt="Virtual model"
                className="w-full h-full object-cover"
              />
            ) : (
              <ScanFace className="size-5 text-lilac-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Virtual Model ของคุณ</p>
            <p className="text-xs text-muted-foreground truncate">สร้างโมเดล 3D จากตัวคุณเอง</p>
          </div>
          <Link
            to="/virtual-model"
            className="shrink-0 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition"
          >
            {bodyModel ? "ดูโมเดล" : "สร้างโมเดล"}
          </Link>
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
              <p className="text-sm font-semibold mt-0.5">{profile.favoriteStyle || "—"}</p>
            </div>
            <span className="text-[11px] text-muted-foreground">{JOINED_LABEL}</span>
          </div>
        </Section>

        {/* Basic info */}
        <Section title="ข้อมูลพื้นฐาน">
          <div className="grid grid-cols-3 gap-3">
            <BasicInfoCard label="เพศ" value={GENDER_LABEL[profile.gender] ?? "—"} />
            <BasicInfoCard
              label="ส่วนสูง"
              value={profile.heightCm ? `${profile.heightCm} ซม.` : "—"}
            />
            <BasicInfoCard
              label="น้ำหนัก"
              value={profile.weightKg ? `${profile.weightKg} กก.` : "—"}
            />
          </div>
        </Section>

        {/* Settings list */}
        <Section title="การตั้งค่า">
          <SettingRow icon={<Bell className="size-4" />} label="การแจ้งเตือน" onClick={soon} />
          <SettingRow icon={<Palette className="size-4" />} label="ธีมและสีหลัก" onClick={soon} />
          <SettingRow icon={<Globe className="size-4" />} label="ภาษา" hint="ไทย" onClick={soon} />
        </Section>

        <button
          onClick={handleLogout}
          className="w-full mt-5 flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-2xl py-3 text-sm font-semibold hover:bg-destructive/15 transition"
        >
          <LogOut className="size-4" /> ออกจากระบบ
        </button>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Digital Wardrobe · v0.1 · ข้อมูลทดสอบ
        </p>
      </div>

      <BottomNav />
      <EditProfileModal
        open={editOpen}
        profile={profile}
        onClose={() => setEditOpen(false)}
        onSave={update}
      />
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

function BasicInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-border/40 shadow-sm px-3 py-4 flex flex-col items-center gap-1">
      <p className="text-sm font-bold leading-none">{value}</p>
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
