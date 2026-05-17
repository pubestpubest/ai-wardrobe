import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Sparkles, Trash2, X } from "lucide-react";
import type { Match, WardrobeItem } from "@/lib/wardrobe";
import type { MatchPatch } from "@/hooks/use-matches";

interface Props {
  match: Match | null;
  items: WardrobeItem[];
  onClose: () => void;
  onSave: (id: string, patch: MatchPatch) => Promise<unknown>;
  onDelete: (id: string) => void;
}

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

export function EditMatchModal({ match, items, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (match) {
      setName(match.name);
      setOccasion(match.occasion ?? "");
      setNote(match.note ?? "");
      setReason(match.reason ?? "");
      setSelectedIds(new Set(match.itemIds));
      setSaving(false);
    }
  }, [match]);

  if (!match) return null;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      toast.error("กรุณาตั้งชื่อแมตช์");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("เลือกอย่างน้อย 1 ไอเท็ม");
      return;
    }
    setSaving(true);
    try {
      await onSave(match.id, {
        name: name.trim(),
        itemIds: Array.from(selectedIds),
        occasion,
        note,
        reason,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    onDelete(match.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {match.source === "ai" && <Sparkles className="size-4 text-lilac-foreground/70" />}
            <h2 className="text-base font-semibold">แก้ไขแมตช์</h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field
            label="ชื่อแมตช์"
            value={name}
            onChange={setName}
            placeholder="เช่น ชุดไปเที่ยวสุดสัปดาห์"
          />
          <Field
            label="โอกาส (ไม่บังคับ)"
            value={occasion}
            onChange={setOccasion}
            placeholder="เช่น ทำงาน, ปาร์ตี้"
          />
          <TextArea label="โน้ต (ไม่บังคับ)" value={note} onChange={setNote} />
          {match.source === "ai" && (
            <TextArea label="เหตุผลจาก AI" value={reason} onChange={setReason} />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground/80">ไอเท็มในแมตช์</span>
            <span className="text-[11px] text-muted-foreground">{selectedIds.size} ชิ้น</span>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">ยังไม่มีไอเท็มในตู้</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const selected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`relative aspect-square rounded-xl ${
                      TONES[idx % 3]
                    } flex items-center justify-center overflow-hidden transition ${
                      selected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "opacity-50 hover:opacity-90"
                    }`}
                    title={item.name}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">{item.emoji}</span>
                    )}
                    {selected && (
                      <span className="absolute top-1 right-1 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="size-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-1">
          <button
            onClick={handleDelete}
            className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0"
            aria-label="ลบแมตช์"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Check className="size-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
      />
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
