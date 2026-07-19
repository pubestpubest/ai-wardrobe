import { ExternalLink, X } from "lucide-react";
import type { AffiliateProduct } from "@/lib/wardrobe";

interface Props {
  item: AffiliateProduct | null;
  onClose: () => void;
}

export function AffiliateItemModal({ item, onClose }: Props) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0">{item.emoji}</span>
            <h2 className="text-base font-semibold truncate">{item.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {item.imageUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-muted">
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <InfoField label="ราคา" value={`${item.price.toLocaleString("th-TH")} บาท`} />
          <InfoField label="ไซซ์" value={item.size ?? "-"} />
          <InfoField label="ร้านค้า" value={item.store} />
          <InfoField label="แพลตฟอร์ม" value={item.platform} />
        </div>

        {item.description && (
          <p className="text-sm text-foreground/70 leading-relaxed italic">{item.description}</p>
        )}

        <a
          href={item.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 mt-1"
        >
          ไปที่ร้านค้า <ExternalLink className="size-4" />
        </a>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-muted rounded-lg px-3 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}
