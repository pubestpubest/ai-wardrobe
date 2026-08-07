import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Trash2, Upload, X } from "lucide-react";
import { uploadWardrobeImage } from "@/lib/upload.functions";
import { useStoreItems, type CreateStoreItemInput } from "@/hooks/use-store-items";
import { CATEGORY_LABELS, FORMALITY_LABELS, type AffiliateProduct } from "@/lib/wardrobe";

// Separate from AffiliateEditModal on purpose (LOCAL-STORE.md §3 / B13b-L1
// grill outcome): that modal is wired to the service-role + assertAdmin path
// and requires marketplace fields (store/platform/affiliateUrl required).
// This one is wired to useStoreItems, i.e. context.supabase + RLS, and never
// shows store/platform at all — a store owner's own listing has neither.

const CATEGORIES = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[];
const FORMALITIES = Object.keys(FORMALITY_LABELS) as (keyof typeof FORMALITY_LABELS)[];
const MAX_DIM = 1024;

type Draft = {
  name: string;
  category: AffiliateProduct["category"];
  color: string;
  // raw comma-separated text, split in toInput — see the onChange comment
  style: string;
  formality: AffiliateProduct["formality"];
  price: string;
  size: string;
  emoji: string;
  imageUrl: string;
  description: string;
  affiliateUrl: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  category: "top",
  color: "",
  style: "",
  formality: "casual",
  price: "",
  size: "",
  emoji: "🛍️",
  imageUrl: "",
  description: "",
  affiliateUrl: "",
};

function toDraft(item: AffiliateProduct | null): Draft {
  if (!item) return EMPTY_DRAFT;
  return {
    name: item.name,
    category: item.category,
    color: item.color ?? "",
    style: item.style.join(", "),
    formality: item.formality,
    price: String(item.price),
    size: item.size ?? "",
    emoji: item.emoji,
    imageUrl: item.imageUrl ?? "",
    description: item.description ?? "",
    affiliateUrl: item.affiliateUrl ?? "",
  };
}

const isHttpUrl = (v: string) => /^https?:\/\//i.test(v);

// Mirrors store-items.functions.ts's StoreItemFieldsSchema so the error
// surfaces before the round trip — same shape as StoreForm's
// validateStoreDraft mirroring store.functions.ts.
function validateDraft(draft: Draft): string | null {
  if (!draft.name.trim()) return "กรุณากรอกชื่อไอเท็ม";
  if (!draft.emoji.trim()) return "กรุณาเลือกอีโมจิ";
  const price = Number(draft.price);
  if (draft.price.trim() === "" || Number.isNaN(price) || price < 0) {
    return "กรุณากรอกราคาที่ถูกต้อง (0 ขึ้นไป)";
  }
  if (draft.imageUrl.trim() && !isHttpUrl(draft.imageUrl.trim())) {
    return "ลิงก์รูปภาพต้องเป็นลิงก์ http(s)";
  }
  if (draft.affiliateUrl.trim() && !isHttpUrl(draft.affiliateUrl.trim())) {
    return "ลิงก์สินค้าต้องเป็นลิงก์ http(s)";
  }
  return null;
}

function toInput(draft: Draft): CreateStoreItemInput {
  return {
    name: draft.name.trim(),
    category: draft.category,
    color: draft.color.trim(),
    style: draft.style
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    formality: draft.formality,
    price: Number(draft.price),
    size: draft.size.trim(),
    emoji: draft.emoji.trim(),
    imageUrl: draft.imageUrl.trim(),
    description: draft.description.trim(),
    affiliateUrl: draft.affiliateUrl.trim(),
  };
}

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function StoreItemModal({
  item,
  open,
  onClose,
}: {
  item: AffiliateProduct | null; // null while open = creating a new item
  open: boolean;
  onClose: () => void;
}) {
  const { create, update, remove, isCreating, isUpdating } = useStoreItems();
  const upload = useServerFn(uploadWardrobeImage);
  const fileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft>(toDraft(item));
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(toDraft(item));
      setConfirmDelete(false);
    }
  }, [open, item]);

  if (!open) return null;

  const saving = isCreating || isUpdating || deleting;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const { publicUrl } = await upload({ data: { imageDataUrl: dataUrl } });
      setDraft((d) => ({ ...d, imageUrl: publicUrl }));
    } catch (e) {
      toast.error(`อัปโหลดรูปไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const validationError = validateDraft(draft);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const payload = toInput(draft);
    try {
      if (item) {
        await update(item.id, payload);
        toast.success("บันทึกไอเท็มแล้ว");
      } else {
        await create(payload);
        toast.success("เพิ่มไอเท็มแล้ว");
      }
      onClose();
    } catch {
      // useStoreItems' onError already toasts with context.
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await remove(item.id);
      toast.success("ลบไอเท็มแล้ว");
      onClose();
    } catch {
      // useStoreItems' onError already toasts with context.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{item ? "แก้ไขไอเท็ม" : "เพิ่มไอเท็ม"}</h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Image: upload or paste a URL — reuses uploadWardrobeImage, no new
            bucket (LOCAL-STORE.md §6). */}
        <div className="flex flex-col gap-2">
          <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square flex items-center justify-center">
            {draft.imageUrl ? (
              <img src={draft.imageUrl} alt={draft.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">{draft.emoji || "🛍️"}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Loader2 className="size-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 rounded-xl bg-muted py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Upload className="size-3.5" /> อัปโหลดรูป
            </button>
            {draft.imageUrl && (
              <button
                type="button"
                onClick={() => setDraft({ ...draft, imageUrl: "" })}
                className="px-3 rounded-xl bg-muted text-xs font-semibold text-muted-foreground"
              >
                ลบรูป
              </button>
            )}
          </div>
          <Field
            label="หรือวางลิงก์รูปภาพ"
            value={draft.imageUrl}
            onChange={(v) => setDraft({ ...draft, imageUrl: v })}
            placeholder="https://..."
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Field
            label="ชื่อ"
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="หมวดหมู่"
              value={draft.category}
              options={CATEGORIES}
              labels={CATEGORY_LABELS}
              onChange={(v) => setDraft({ ...draft, category: v as AffiliateProduct["category"] })}
            />
            <SelectField
              label="ความเป็นทางการ"
              value={draft.formality}
              options={FORMALITIES}
              labels={FORMALITY_LABELS}
              onChange={(v) =>
                setDraft({ ...draft, formality: v as AffiliateProduct["formality"] })
              }
            />
          </div>
          <Field
            label="สี"
            value={draft.color}
            onChange={(v) => setDraft({ ...draft, color: v })}
          />
          <Field
            label="สไตล์ (คั่นด้วย ,)"
            // Raw text, not a round-tripped array: splitting on every keystroke
            // makes v -> array -> join produce the same string React already has,
            // so the "," is swallowed and "a,b" silently becomes one tag "ab".
            value={draft.style}
            onChange={(v) => setDraft({ ...draft, style: v })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="ราคา (บาท)"
              value={draft.price}
              onChange={(v) => setDraft({ ...draft, price: v })}
              type="number"
            />
            <Field
              label="ไซซ์"
              value={draft.size}
              onChange={(v) => setDraft({ ...draft, size: v })}
            />
          </div>
          <Field
            label="อีโมจิ"
            value={draft.emoji}
            onChange={(v) => setDraft({ ...draft, emoji: v })}
          />
          <TextArea
            label="คำอธิบาย"
            value={draft.description}
            onChange={(v) => setDraft({ ...draft, description: v })}
          />
          <Field
            label="ลิงก์สินค้า (ไม่บังคับ)"
            value={draft.affiliateUrl}
            onChange={(v) => setDraft({ ...draft, affiliateUrl: v })}
            placeholder="https://..."
          />

          <div className="flex gap-2 mt-2">
            {item && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`h-12 px-4 rounded-full flex items-center justify-center gap-1 flex-shrink-0 text-sm font-medium transition disabled:opacity-60 ${
                  confirmDelete
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                <Trash2 className="size-4" /> {confirmDelete ? "ยืนยันลบ" : "ลบ"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              บันทึก
            </button>
          </div>
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
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary resize-none"
      />
    </label>
  );
}
