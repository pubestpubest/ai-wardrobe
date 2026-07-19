import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Trash2, X } from "lucide-react";
import { useAffiliateProducts, type NewAffiliateProduct } from "@/hooks/use-affiliate-products";
import type { AffiliateProduct } from "@/lib/wardrobe";

const CATEGORIES = ["top", "bottom", "outerwear", "shoes", "dress", "accessory"] as const;
const FORMALITIES = ["casual", "smart-casual", "formal"] as const;

const EMPTY_DRAFT: NewAffiliateProduct = {
  name: "",
  category: "top",
  color: "",
  style: [],
  formality: "casual",
  price: 0,
  size: "",
  store: "",
  platform: "",
  emoji: "🛍️",
  imageUrl: "",
  description: "",
  affiliateUrl: "",
};

interface Props {
  product: AffiliateProduct | null; // null while open = creating a new product
  open: boolean;
  onClose: () => void;
}

export function AffiliateEditModal({ product, open, onClose }: Props) {
  const { create, update, remove } = useAffiliateProducts();
  const [draft, setDraft] = useState<NewAffiliateProduct>(product ?? EMPTY_DRAFT);
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(product ?? EMPTY_DRAFT);
      setConfirmDelete(false);
    }
  }, [open, product]);

  useEffect(() => {
    setImgError(false);
  }, [draft.imageUrl]);

  if (!open) return null;

  const handleSave = async () => {
    if (
      !draft.name.trim() ||
      !draft.store.trim() ||
      !draft.platform.trim() ||
      !draft.emoji.trim()
    ) {
      toast.error("กรุณากรอกชื่อ ร้านค้า แพลตฟอร์ม และอีโมจิ");
      return;
    }
    if (!draft.affiliateUrl.trim()) {
      toast.error("กรุณาระบุลิงก์สินค้า");
      return;
    }
    const payload: NewAffiliateProduct = {
      ...draft,
      name: draft.name.trim(),
      store: draft.store.trim(),
      platform: draft.platform.trim(),
      emoji: draft.emoji.trim(),
      affiliateUrl: draft.affiliateUrl.trim(),
      color: draft.color?.trim() || undefined,
      size: draft.size?.trim() || undefined,
      imageUrl: draft.imageUrl?.trim() || undefined,
      description: draft.description?.trim() || undefined,
    };
    setSaving(true);
    try {
      if (product) {
        await update(product.id, payload);
      } else {
        await create(payload);
      }
      onClose();
    } catch {
      // hook's onError already showed a toast
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await remove(product.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{product ? "แก้ไขไอเท็ม" : "เพิ่มไอเท็ม"}</h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Image preview */}
        <div className="flex flex-col gap-2">
          {draft.imageUrl && !imgError ? (
            <div className="rounded-2xl overflow-hidden bg-muted aspect-square">
              <img
                src={draft.imageUrl}
                alt={draft.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-muted aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <span className="text-6xl">{draft.emoji}</span>
              {draft.imageUrl && imgError && (
                <span className="text-xs text-destructive">รูปโหลดไม่ได้</span>
              )}
            </div>
          )}
          <Field
            label="ลิงก์รูปภาพ"
            value={draft.imageUrl ?? ""}
            onChange={(v) => setDraft({ ...draft, imageUrl: v })}
            placeholder="https://..."
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
              options={CATEGORIES as unknown as string[]}
              onChange={(v) => setDraft({ ...draft, category: v as AffiliateProduct["category"] })}
            />
            <SelectField
              label="ความเป็นทางการ"
              value={draft.formality}
              options={FORMALITIES as unknown as string[]}
              onChange={(v) =>
                setDraft({ ...draft, formality: v as AffiliateProduct["formality"] })
              }
            />
          </div>
          <Field
            label="สี"
            value={draft.color ?? ""}
            onChange={(v) => setDraft({ ...draft, color: v })}
          />
          <Field
            label="สไตล์ (คั่นด้วย ,)"
            value={draft.style.join(", ")}
            onChange={(v) =>
              setDraft({
                ...draft,
                style: v
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="ราคา (บาท)"
              value={String(draft.price)}
              onChange={(v) => setDraft({ ...draft, price: Number(v) || 0 })}
              type="number"
            />
            <Field
              label="ไซซ์"
              value={draft.size ?? ""}
              onChange={(v) => setDraft({ ...draft, size: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="ร้านค้า"
              value={draft.store}
              onChange={(v) => setDraft({ ...draft, store: v })}
            />
            <Field
              label="แพลตฟอร์ม"
              value={draft.platform}
              onChange={(v) => setDraft({ ...draft, platform: v })}
            />
          </div>
          <Field
            label="อีโมจิ"
            value={draft.emoji}
            onChange={(v) => setDraft({ ...draft, emoji: v })}
          />
          <TextArea
            label="คำอธิบาย"
            value={draft.description ?? ""}
            onChange={(v) => setDraft({ ...draft, description: v })}
          />
          <Field
            label="ลิงก์สินค้า"
            value={draft.affiliateUrl}
            onChange={(v) => setDraft({ ...draft, affiliateUrl: v })}
            placeholder="https://..."
          />

          <div className="flex gap-2 mt-2">
            {product && (
              <button
                onClick={handleDelete}
                className={`h-12 px-4 rounded-full flex items-center justify-center gap-1 flex-shrink-0 text-sm font-medium transition ${
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
              disabled={saving}
              className="flex-1 bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check className="size-4" /> บันทึก
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
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
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
            {o}
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
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary resize-none"
      />
    </label>
  );
}
