import { useEffect, useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { ITEM_TAGS } from "@/lib/wardrobe";
import type { StoredItem } from "@/hooks/use-wardrobe";

const CATEGORIES = ["top", "bottom", "outerwear", "shoes", "dress", "accessory"] as const;
const FORMALITIES = ["casual", "smart-casual", "formal"] as const;

export function EditItem({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: StoredItem | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<StoredItem>) => void;
  onDelete?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<StoredItem | null>(item);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  if (!item || !draft) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">แก้ไขไอเท็ม</h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
          {draft.imageUrl ? (
            <img src={draft.imageUrl} alt={draft.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">
              {draft.emoji}
            </div>
          )}
          {draft.tags && draft.tags.length > 0 && (
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
              {draft.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] font-medium bg-white/85 backdrop-blur-sm text-foreground rounded-full px-2.5 py-1 shadow-sm"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

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
              options={CATEGORIES as unknown as string[]}
              onChange={(v) => setDraft({ ...draft, category: v as StoredItem["category"] })}
            />
            <SelectField
              label="ความเป็นทางการ"
              value={draft.formality}
              options={FORMALITIES as unknown as string[]}
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

          <div className="flex gap-2 mt-2">
            {onDelete && (
              <button
                onClick={() => {
                  onDelete(item.id);
                  onClose();
                }}
                className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0"
                aria-label="ลบ"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              onClick={() => {
                const { id, ...patch } = draft;
                onSave(id, patch);
                onClose();
              }}
              className="flex-1 bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2"
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
