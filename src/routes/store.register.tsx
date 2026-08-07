import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import type { CreateStoreInput } from "@/hooks/use-store";
import { STORE_PACKAGES } from "@/lib/wardrobe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/store/register")({
  component: StoreRegisterPage,
  head: () => ({
    meta: [
      { title: "สมัครร้านค้า · Digital Wardrobe" },
      { name: "description", content: "ลงทะเบียนร้านค้าท้องถิ่นบน Digital Wardrobe" },
    ],
  }),
});

type Draft = {
  name: string;
  description: string;
  contactPhone: string;
  contactLine: string;
  contactEmail: string;
  address: string;
  googleMapUrl: string;
  onlineStoreUrl: string;
  logoUrl: string;
  coverUrl: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  contactPhone: "",
  contactLine: "",
  contactEmail: "",
  address: "",
  googleMapUrl: "",
  onlineStoreUrl: "",
  logoUrl: "",
  coverUrl: "",
};

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

// Mirrors store.functions.ts's CreateStoreSchema so the error surfaces before
// the round trip, not just after it.
function validate(draft: Draft): string | null {
  if (!draft.name.trim()) return "กรุณากรอกชื่อร้าน";
  if (!draft.contactPhone.trim() && !draft.contactLine.trim() && !draft.address.trim()) {
    return "กรุณากรอกช่องทางติดต่ออย่างน้อยหนึ่งอย่าง: เบอร์โทร, LINE หรือที่อยู่";
  }
  const urlFields: [string, string][] = [
    ["ลิงก์แผนที่", draft.googleMapUrl],
    ["ลิงก์ร้านค้าออนไลน์", draft.onlineStoreUrl],
    ["ลิงก์โลโก้", draft.logoUrl],
    ["ลิงก์ภาพปก", draft.coverUrl],
  ];
  for (const [label, v] of urlFields) {
    if (v.trim() && !isHttpUrl(v.trim())) return `${label}ต้องเป็นลิงก์ http(s)`;
  }
  return null;
}

function StoreRegisterPage() {
  const { store, isLoading, create } = useStore();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD] text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  // Idempotent on revisit: a store already registered shows the panel, not a
  // second form (B12a-L1 plan).
  if (store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD] px-5">
        <div className="glass w-full max-w-md rounded-3xl border border-white/60 shadow-xl shadow-lilac/20 p-6 flex flex-col items-center gap-4 text-center">
          <div className="size-16 rounded-full bg-lilac text-lilac-foreground flex items-center justify-center">
            <Check className="size-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">สมัครร้านค้าสำเร็จ</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ร้าน “{store.name}” พร้อมใช้งานแล้ว
            </p>
          </div>
          <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/70 border border-border/40">
            <span className="text-xs text-muted-foreground">แพ็กเกจ</span>
            <span className="text-sm font-semibold">{STORE_PACKAGES[store.package].label}</span>
          </div>
          <p className="text-xs text-muted-foreground">หน้าจัดการร้านกำลังมาเร็ว ๆ นี้</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    const validationError = validate(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: CreateStoreInput = {
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        contactPhone: draft.contactPhone.trim() || undefined,
        contactLine: draft.contactLine.trim() || undefined,
        contactEmail: draft.contactEmail.trim() || undefined,
        address: draft.address.trim() || undefined,
        googleMapUrl: draft.googleMapUrl.trim() || undefined,
        onlineStoreUrl: draft.onlineStoreUrl.trim() || undefined,
        logoUrl: draft.logoUrl.trim() || undefined,
        coverUrl: draft.coverUrl.trim() || undefined,
      };
      await create(payload);
      toast.success("สมัครร้านค้าสำเร็จ");
    } catch {
      // useStore's onError already toasts with context — don't double-toast.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFD] px-5 py-10">
      <div className="glass w-full max-w-lg mx-auto rounded-3xl border border-white/60 shadow-xl shadow-lilac/20 p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">สมัครร้านค้า</h1>
          <p className="text-xs text-muted-foreground mt-1">
            ลงทะเบียนร้านค้าของคุณเพื่อแสดงในหน้าช้อปปิ้งของ Digital Wardrobe
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Field
            label="ชื่อร้าน *"
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
            placeholder="เช่น ร้านป้าหมวย สยาม"
          />
          <TextArea
            label="รายละเอียดร้าน"
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
            placeholder="บอกเล่าสไตล์ร้านของคุณ"
          />

          <p className="text-xs font-semibold text-muted-foreground mt-1">
            ช่องทางติดต่อ (กรอกอย่างน้อย 1 อย่าง)
          </p>
          <Field
            label="เบอร์โทร"
            value={draft.contactPhone}
            onChange={(v) => setDraft({ ...draft, contactPhone: v })}
            placeholder="08x-xxx-xxxx"
          />
          <Field
            label="LINE"
            value={draft.contactLine}
            onChange={(v) => setDraft({ ...draft, contactLine: v })}
            placeholder="@yourstore"
          />
          <Field
            label="ที่อยู่"
            value={draft.address}
            onChange={(v) => setDraft({ ...draft, address: v })}
            placeholder="แถวไหนของกรุงเทพฯ"
          />
          <Field
            label="อีเมลติดต่อ"
            value={draft.contactEmail}
            onChange={(v) => setDraft({ ...draft, contactEmail: v })}
            placeholder="you@store.com"
            type="email"
          />

          <p className="text-xs font-semibold text-muted-foreground mt-1">
            ลิงก์เพิ่มเติม (ไม่บังคับ)
          </p>
          <Field
            label="ลิงก์แผนที่"
            value={draft.googleMapUrl}
            onChange={(v) => setDraft({ ...draft, googleMapUrl: v })}
            placeholder="https://maps.google.com/..."
          />
          <Field
            label="ร้านค้าออนไลน์"
            value={draft.onlineStoreUrl}
            onChange={(v) => setDraft({ ...draft, onlineStoreUrl: v })}
            placeholder="https://..."
          />
          <Field
            label="โลโก้ (ลิงก์รูป)"
            value={draft.logoUrl}
            onChange={(v) => setDraft({ ...draft, logoUrl: v })}
            placeholder="https://..."
          />
          <Field
            label="ภาพปก (ลิงก์รูป)"
            value={draft.coverUrl}
            onChange={(v) => setDraft({ ...draft, coverUrl: v })}
            placeholder="https://..."
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-semibold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none transition mt-2"
          >
            {submitting ? "กำลังสมัคร…" : "สมัครร้านค้า"}
          </button>

          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 text-center mt-1 transition"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white/70 border border-border/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary transition"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="bg-white/70 border border-border/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary resize-none transition"
      />
    </label>
  );
}
