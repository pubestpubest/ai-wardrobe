import { X, Trash2, ShirtIcon, Star } from "lucide-react";
import type { WardrobeItem } from "@/lib/wardrobe";
import { CATEGORY_LABELS, FORMALITY_LABELS } from "@/lib/wardrobe";

const FORMALITY_COLOR: Record<WardrobeItem["formality"], string> = {
  casual: "bg-sky text-sky-foreground",
  "smart-casual": "bg-lilac text-lilac-foreground",
  formal: "bg-blush text-blush-foreground",
};

interface Props {
  item: WardrobeItem | null;
  onClose: () => void;
  onDelete: (id: string, imageUrl?: string) => void;
  onWear: (id: string) => void;
}

export function ItemDetail({ item, onClose, onDelete, onWear }: Props) {
  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-background shadow-2xl max-h-[90dvh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="size-4" />
        </button>

        {/* Image */}
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden bg-muted aspect-[4/3] relative">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">
              {item.emoji}
            </div>
          )}
          {/* Emoji badge */}
          <span className="absolute top-3 left-3 text-2xl bg-white/80 backdrop-blur-sm rounded-xl px-2 py-1">
            {item.emoji}
          </span>
          {/* Category badge */}
          <span className="absolute top-3 right-3 text-xs font-medium bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-foreground">
            {CATEGORY_LABELS[item.category]}
          </span>
        </div>

        {/* Details */}
        <div className="px-5 pt-4 pb-8 flex flex-col gap-4">
          {/* Name */}
          <h2 className="text-xl font-bold leading-tight">{item.name}</h2>

          {/* Color + Formality row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 text-sm">
              <span
                className="size-3 rounded-full border border-border"
                style={{ background: colorToHex(item.color) }}
              />
              {item.color}
            </span>
            <span
              className={`text-xs font-medium rounded-full px-3 py-1.5 ${FORMALITY_COLOR[item.formality]}`}
            >
              {FORMALITY_LABELS[item.formality]}
            </span>
          </div>

          {/* Style tags */}
          {item.style.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.style.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-secondary text-secondary-foreground rounded-full px-3 py-1"
                >
                  #{s}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-lilac/40 rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-foreground">{item.wearCount ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">ครั้งที่ใส่</p>
            </div>
            <div className="flex-1 bg-blush/40 rounded-2xl px-4 py-3 text-center">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {item.lastWorn ? formatDate(item.lastWorn) : "ยังไม่เคย"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">ใส่ล่าสุด</p>
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => {
              onWear(item.id);
              onClose();
            }}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <ShirtIcon className="size-4" /> ใส่วันนี้
          </button>

          <button
            onClick={() => {
              onDelete(item.id, item.imageUrl);
              onClose();
            }}
            className="w-full bg-destructive/10 text-destructive rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="size-4" /> ลบออกจากตู้
          </button>
        </div>
      </div>
    </>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

// Best-effort pastel color approximation from Thai color names
function colorToHex(color: string): string {
  const map: Record<string, string> = {
    ขาว: "#ffffff",
    ดำ: "#1a1a1a",
    แดง: "#f87171",
    ชมพู: "#fccce2",
    ม่วง: "#d2ccfc",
    ม่วงพาสเทล: "#d2ccfc",
    ฟ้า: "#cce2fc",
    ฟ้าอ่อน: "#cce2fc",
    น้ำเงิน: "#3b82f6",
    เขียว: "#86efac",
    เหลือง: "#fde68a",
    ส้ม: "#fed7aa",
    เทา: "#d1d5db",
    ครีม: "#fef3c7",
    นู้ด: "#fde8d8",
    พาสเทล: "#f0e6ff",
    น้ำตาล: "#d97706",
  };
  return map[color] ?? "#e5e7eb";
}
