import { useState } from "react";
import type { CreateStoreInput } from "@/hooks/use-store";

// Extracted from store.register.tsx (B12a) so B12b's /store can reuse the
// exact same fields, validation and layout for both the registration case
// (no store row yet) and the edit case (store already exists) — one
// component, driven entirely by props (B12b-L1 plan item 3).
export const GALLERY_MAX = 8;

export type StoreFormDraft = {
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
  galleryUrls: string[];
};

export const EMPTY_STORE_DRAFT: StoreFormDraft = {
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
  galleryUrls: [],
};

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

// Mirrors store.functions.ts's StoreFieldsSchema/hasContact refine so the
// error surfaces before the round trip, not just after it. Same rules for
// create and update — an edit that clears every contact channel is exactly
// as dead as one that never had one.
export function validateStoreDraft(draft: StoreFormDraft): string | null {
  if (!draft.name.trim()) return "กรุณากรอกชื่อร้าน";
  if (!draft.contactPhone.trim() && !draft.contactLine.trim() && !draft.address.trim()) {
    return "กรุณากรอกช่องทางติดต่ออย่างน้อยหนึ่งอย่าง: เบอร์โทร, LINE หรือที่อยู่";
  }
  const urlFields: [string, string][] = [
    ["ลิงก์แผนที่", draft.googleMapUrl],
    ["ลิงก์ร้านค้าออนไลน์", draft.onlineStoreUrl],
    ["ลิงก์โลโก้", draft.logoUrl],
    ["ลิงก์ภาพปก", draft.coverUrl],
    ...draft.galleryUrls
      .map((u, i) => [`รูปแกลเลอรีที่ ${i + 1}`, u] as [string, string])
      .filter(([, v]) => v.trim() !== ""),
  ];
  for (const [label, v] of urlFields) {
    if (v.trim() && !isHttpUrl(v.trim())) return `${label}ต้องเป็นลิงก์ http(s)`;
  }
  return null;
}

function toStoreInput(draft: StoreFormDraft): CreateStoreInput {
  return {
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
    // Drop blank rows — an empty '+ เพิ่มรูป' slot would otherwise fail
    // 028's stores_gallery_http_only CHECK on submit.
    galleryUrls: draft.galleryUrls.map((u) => u.trim()).filter(Boolean),
  };
}

export function StoreFormFields({
  draft,
  onChange,
}: {
  draft: StoreFormDraft;
  onChange: (d: StoreFormDraft) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field
        label="ชื่อร้าน *"
        value={draft.name}
        onChange={(v) => onChange({ ...draft, name: v })}
        placeholder="เช่น ร้านป้าหมวย สยาม"
      />
      <TextArea
        label="รายละเอียดร้าน"
        value={draft.description}
        onChange={(v) => onChange({ ...draft, description: v })}
        placeholder="บอกเล่าสไตล์ร้านของคุณ"
      />

      <p className="text-xs font-semibold text-muted-foreground mt-1">
        ช่องทางติดต่อ (กรอกอย่างน้อย 1 อย่าง)
      </p>
      <Field
        label="เบอร์โทร"
        value={draft.contactPhone}
        onChange={(v) => onChange({ ...draft, contactPhone: v })}
        placeholder="08x-xxx-xxxx"
      />
      <Field
        label="LINE"
        value={draft.contactLine}
        onChange={(v) => onChange({ ...draft, contactLine: v })}
        placeholder="@yourstore"
      />
      <Field
        label="ที่อยู่"
        value={draft.address}
        onChange={(v) => onChange({ ...draft, address: v })}
        placeholder="แถวไหนของกรุงเทพฯ"
      />
      <Field
        label="อีเมลติดต่อ"
        value={draft.contactEmail}
        onChange={(v) => onChange({ ...draft, contactEmail: v })}
        placeholder="you@store.com"
        type="email"
      />

      <p className="text-xs font-semibold text-muted-foreground mt-1">ลิงก์เพิ่มเติม (ไม่บังคับ)</p>
      <Field
        label="ลิงก์แผนที่"
        value={draft.googleMapUrl}
        onChange={(v) => onChange({ ...draft, googleMapUrl: v })}
        placeholder="https://maps.google.com/..."
      />
      <Field
        label="ร้านค้าออนไลน์"
        value={draft.onlineStoreUrl}
        onChange={(v) => onChange({ ...draft, onlineStoreUrl: v })}
        placeholder="https://..."
      />
      <Field
        label="โลโก้ (ลิงก์รูป)"
        value={draft.logoUrl}
        onChange={(v) => onChange({ ...draft, logoUrl: v })}
        placeholder="https://..."
      />
      <Field
        label="ภาพปก (ลิงก์รูป)"
        value={draft.coverUrl}
        onChange={(v) => onChange({ ...draft, coverUrl: v })}
        placeholder="https://..."
      />

      {/* Gallery — shopfront/interior photos, distinct from product images.
          Capped at 8 to match 028's stores_gallery_max CHECK. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          แกลเลอรีร้าน ({draft.galleryUrls.length}/{GALLERY_MAX})
        </span>
        {draft.galleryUrls.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <img src={url} alt="" className="size-10 rounded-lg object-cover bg-muted shrink-0" />
            <input
              value={url}
              onChange={(e) => {
                const next = [...draft.galleryUrls];
                next[i] = e.target.value;
                onChange({ ...draft, galleryUrls: next });
              }}
              placeholder="https://..."
              className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
            />
            <button
              type="button"
              onClick={() =>
                onChange({ ...draft, galleryUrls: draft.galleryUrls.filter((_, k) => k !== i) })
              }
              className="shrink-0 px-3 py-2 rounded-lg bg-muted text-xs font-semibold hover:bg-border transition"
            >
              ลบ
            </button>
          </div>
        ))}
        {draft.galleryUrls.length < GALLERY_MAX && (
          <button
            type="button"
            onClick={() => onChange({ ...draft, galleryUrls: [...draft.galleryUrls, ""] })}
            className="self-start px-4 py-2 rounded-full bg-muted text-xs font-semibold hover:bg-border transition"
          >
            + เพิ่มรูป
          </button>
        )}
      </div>
    </div>
  );
}

// Full card: header + fields + error + submit button. Used as-is by both
// store.register.tsx (create) and /store (create when no store row yet, edit
// once one exists) — `onSubmit` and the labels are the only thing that
// differs between those call sites.
export function StoreForm({
  heading,
  subheading,
  initial,
  submitLabel,
  submittingLabel,
  submitting,
  onSubmit,
  footer,
}: {
  heading: string;
  subheading: string;
  initial: StoreFormDraft;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  onSubmit: (payload: CreateStoreInput) => Promise<void> | void;
  footer?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<StoreFormDraft>(initial);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const validationError = validateStoreDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    await onSubmit(toStoreInput(draft));
  };

  return (
    <div className="glass w-full max-w-lg mx-auto rounded-3xl border border-white/60 shadow-xl shadow-lilac/20 p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{heading}</h1>
        <p className="text-xs text-muted-foreground mt-1">{subheading}</p>
      </div>

      <StoreFormFields draft={draft} onChange={setDraft} />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-semibold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none transition mt-2"
      >
        {submitting ? submittingLabel : submitLabel}
      </button>

      {footer}
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
