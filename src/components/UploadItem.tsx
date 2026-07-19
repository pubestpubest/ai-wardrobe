import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Upload, X, Check, Sparkles, Eraser, Undo2 } from "lucide-react";
import { analyzeClothing } from "@/lib/analyze.functions";
import { uploadWardrobeImage } from "@/lib/upload.functions";
import { ITEM_TAGS, TAG_COLORS } from "@/lib/wardrobe";
import type { StoredItem } from "@/hooks/use-wardrobe";

const MAX_DIM = 1024;

type Draft = Omit<StoredItem, "id" | "imageUrl">;

const EMPTY_DRAFT: Draft = {
  name: "",
  color: "",
  category: "top",
  formality: "casual",
  style: [],
  tags: [],
  emoji: "👕",
};

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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("อ่านผลลัพธ์ไม่สำเร็จ"));
    reader.readAsDataURL(blob);
  });
}

const CHECKERBOARD_STYLE = {
  backgroundImage:
    "conic-gradient(#d4d4d8 90deg, transparent 90deg 180deg, #d4d4d8 180deg 270deg, transparent 270deg)",
  backgroundSize: "16px 16px",
};

export function UploadItem({
  open,
  onClose,
  onAdd,
  env,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: StoredItem) => Promise<unknown>;
  env?: string;
}) {
  const analyze = useServerFn(analyzeClothing);
  const upload = useServerFn(uploadWardrobeImage);
  const fileRef = useRef<HTMLInputElement>(null);
  // Bumped whenever the target image changes/resets; async handlers capture it
  // and bail if it changed mid-await (e.g. modal closed during bg removal) —
  // otherwise a late result leaks a stale cutout into the next upload.
  const genRef = useRef(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [isCutout, setIsCutout] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [bgRemoving, setBgRemoving] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    genRef.current++;
    setPreview(null);
    setOriginal(null);
    setIsCutout(false);
    setDraft(null);
    setAiLoading(false);
    setBgRemoving(false);
    setSaving(false);
  }

  async function handleFile(file: File) {
    genRef.current++;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setPreview(dataUrl);
      setOriginal(null);
      setIsCutout(false);
      setDraft(EMPTY_DRAFT);
    } catch (e) {
      console.error(e);
      toast.error(`อ่านไฟล์ไม่สำเร็จ: ${(e as Error).message}`);
    }
  }

  async function removeBg() {
    if (!preview || bgRemoving) return;
    const gen = genRef.current;
    setBgRemoving(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(preview);
      const dataUrl = await blobToDataUrl(blob);
      if (genRef.current !== gen) return; // modal reset / image swapped mid-removal — drop the result
      setOriginal((o) => o ?? preview);
      setPreview(dataUrl);
      setIsCutout(true);
    } catch (e) {
      if (genRef.current !== gen) return; // stale failure after reset — don't toast
      console.error(e);
      toast.error(`ลบพื้นหลังไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      if (genRef.current === gen) setBgRemoving(false);
    }
  }

  function revertToOriginal() {
    if (!original) return;
    setPreview(original);
    setIsCutout(false);
  }

  async function fillWithAI() {
    if (!preview || aiLoading) return;
    const gen = genRef.current;
    setAiLoading(true);
    try {
      const result = await analyze({
        data: { imageDataUrl: preview, env: env as "dev" | "uat" | "prod" | undefined },
      });
      if (genRef.current !== gen) return; // modal reset / image swapped mid-analysis — drop the result
      setDraft({ ...result, tags: draft?.tags ?? [] });
      toast.success("AI วิเคราะห์เสร็จแล้ว");
    } catch (e) {
      if (genRef.current !== gen) return;
      console.error(e);
      toast.error(`AI วิเคราะห์ไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      if (genRef.current === gen) setAiLoading(false);
    }
  }

  async function save() {
    if (!draft || !preview) return;
    if (!draft.name.trim()) {
      toast.error("กรุณาตั้งชื่อไอเท็มก่อน");
      return;
    }
    setSaving(true);
    try {
      const { publicUrl } = await upload({ data: { imageDataUrl: preview } });
      await onAdd({ ...draft, id: crypto.randomUUID(), imageUrl: publicUrl });
      toast.success("เพิ่มไอเท็มแล้ว");
      reset();
      onClose();
    } catch (e) {
      toast.error(`บันทึกไม่สำเร็จ: ${(e as Error).message}`);
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
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
            <p className="text-xs text-muted-foreground">หรือกรอกข้อมูลเอง แล้วใช้ AI ช่วยทีหลัง</p>
          </button>
        )}

        {preview && (
          <div
            className="relative rounded-2xl overflow-hidden bg-muted aspect-square"
            style={isCutout ? CHECKERBOARD_STYLE : undefined}
          >
            <img src={preview} alt="preview" className="w-full h-full object-contain" />
            {draft?.tags && draft.tags.length > 0 && (
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
                {draft.tags.map((t) => (
                  <span
                    key={t}
                    className={`text-[11px] font-medium ${TAG_COLORS[t] ?? "bg-white/85"} backdrop-blur-sm text-foreground rounded-full px-2.5 py-1 shadow-sm`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={fillWithAI}
                disabled={aiLoading || bgRemoving}
                className="flex-1 rounded-2xl bg-sky text-sky-foreground py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60 shadow-sm"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> AI กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> ให้ AI ช่วยกรอก
                  </>
                )}
              </button>

              {!isCutout && (
                <button
                  onClick={removeBg}
                  disabled={aiLoading || bgRemoving}
                  className="flex-1 rounded-2xl bg-lilac text-lilac-foreground py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60 shadow-sm"
                >
                  {bgRemoving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Eraser className="size-4" /> ลบพื้นหลัง
                    </>
                  )}
                </button>
              )}
            </div>

            {bgRemoving && (
              <p className="text-xs text-muted-foreground text-center">
                กำลังลบพื้นหลัง… (โหลดโมเดลครั้งแรกอาจใช้เวลาสักครู่)
              </p>
            )}

            {isCutout && original && !bgRemoving && (
              <button
                onClick={revertToOriginal}
                className="self-center text-xs text-muted-foreground underline flex items-center gap-1 hover:text-foreground transition"
              >
                <Undo2 className="size-3" /> ใช้รูปเดิม
              </button>
            )}
          </div>
        )}

        {draft && (
          <div className="flex flex-col gap-3">
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
              value={draft.style?.join(", ") || ""}
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
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">แท็ก</span>
              <div className="flex flex-wrap gap-2">
                {ITEM_TAGS.map((tag) => {
                  const selected = draft.tags?.includes(tag) ?? false;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          tags: selected
                            ? (draft.tags ?? []).filter((t) => t !== tag)
                            : [...(draft.tags ?? []), tag],
                        })
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground border border-border/40 hover:bg-border"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
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
