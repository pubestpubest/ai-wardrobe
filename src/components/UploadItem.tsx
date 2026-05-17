import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X, Check } from "lucide-react";
import { analyzeClothing } from "@/lib/analyze.functions";
import { uploadWardrobeImage } from "@/lib/upload.functions";
import type { StoredItem } from "@/hooks/use-wardrobe";

const MAX_DIM = 1024;

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

export function UploadItem({
  open,
  onClose,
  onAdd,
  model,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: StoredItem) => Promise<unknown>;
  model?: string;
}) {
  const analyze = useServerFn(analyzeClothing);
  const upload = useServerFn(uploadWardrobeImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<StoredItem, "id" | "imageUrl"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPreview(null);
    setDraft(null);
    setError(null);
    setLoading(false);
    setSaving(false);
  }

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPreview(dataUrl);
      const result = await analyze({ data: { imageDataUrl: dataUrl, model } });
      setDraft(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!draft || !preview) return;
    setSaving(true);
    setError(null);
    try {
      const { publicUrl } = await upload({ data: { imageDataUrl: preview } });
      await onAdd({ ...draft, id: crypto.randomUUID(), imageUrl: publicUrl });
      reset();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">เพิ่มเสื้อผ้าใหม่</h2>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        {!preview && (
          <button
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-2xl py-12 flex flex-col items-center gap-2 hover:bg-muted transition"
          >
            <Upload className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">เลือกรูปเสื้อผ้า</p>
            <p className="text-xs text-muted-foreground">AI จะช่วยกรอกหมวดหมู่ สี และสไตล์ให้</p>
          </button>
        )}

        {preview && (
          <div className="rounded-2xl overflow-hidden bg-muted aspect-square">
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center py-3">
            <Loader2 className="size-4 animate-spin" />
            AI กำลังวิเคราะห์...
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        {draft && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">AI วิเคราะห์ได้ดังนี้ (แก้ไขได้):</p>
            <Field
              label="ชื่อ"
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
            />
            <Field
              label="สี"
              value={draft.color}
              onChange={(v) => setDraft({ ...draft, color: v })}
            />
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="หมวดหมู่"
                value={draft.category}
                options={["top", "bottom", "outerwear", "shoes", "dress", "accessory"]}
                onChange={(v) => setDraft({ ...draft, category: v as StoredItem["category"] })}
              />
              <SelectField
                label="ความเป็นทางการ"
                value={draft.formality}
                options={["casual", "smart-casual", "formal"]}
                onChange={(v) => setDraft({ ...draft, formality: v as StoredItem["formality"] })}
              />
            </div>
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
            <button
              onClick={save}
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                <>
                  <Check className="size-4" /> บันทึกเข้าตู้
                </>
              )}
            </button>
          </div>
        )}

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
    </div>
  );
}

function Field({
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
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
