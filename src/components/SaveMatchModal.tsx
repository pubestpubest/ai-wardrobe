import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { WardrobeItem } from "@/lib/wardrobe";
import type { NewMatch } from "@/hooks/use-matches";

interface Props {
  open: boolean;
  items: WardrobeItem[];
  onClose: () => void;
  onSave: (m: NewMatch) => Promise<unknown>;
}

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

export function SaveMatchModal({ open, items, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setOccasion("");
      setNote("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim() || items.length === 0 || saving) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        itemIds: items.map((i) => i.id),
        occasion: occasion.trim() || undefined,
        note: note.trim() || undefined,
        source: "manual",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">บันทึกแมตช์</h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">{items.length} ไอเท็ม</p>
          <div className="grid grid-cols-4 gap-2">
            {items.slice(0, 8).map((item, idx) => (
              <div
                key={item.id}
                className={`aspect-square rounded-xl ${TONES[idx % 3]} flex items-center justify-center overflow-hidden`}
              >
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">{item.emoji}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">ชื่อแมตช์</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ชุดไปเที่ยวสุดสัปดาห์"
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">โอกาส (ไม่บังคับ)</span>
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="เช่น ทำงาน, ปาร์ตี้"
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">โน้ต (ไม่บังคับ)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary resize-none"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={!name.trim() || items.length === 0 || saving}
            className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 mt-2"
          >
            <Check className="size-4" /> {saving ? "กำลังบันทึก..." : "บันทึกแมตช์"}
          </button>
        </div>
      </div>
    </div>
  );
}
