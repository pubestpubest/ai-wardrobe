import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Camera, Download, Image as ImageIcon, Share2, Sparkles, X } from "lucide-react";
import type { Match, WardrobeItem } from "@/lib/wardrobe";

interface Props {
  match: Match | null;
  items: WardrobeItem[];
  onClose: () => void;
}

type Tab = "infographic" | "photo";

export function ShareMatchModal({ match, items, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("infographic");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (match) {
      setTab("infographic");
      setPhoto(null);
      setBusy(false);
    }
  }, [match]);

  if (!match) return null;

  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = match.itemIds.map((id) => byId.get(id)).filter(Boolean) as WardrobeItem[];

  const activeRef = tab === "infographic" ? infoRef : photoRef;
  const canShare = tab === "infographic" || !!photo;

  async function renderPng(): Promise<{ blob: Blob; dataUrl: string } | null> {
    const node = activeRef.current;
    if (!node) return null;
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, dataUrl };
  }

  async function handleSave() {
    if (!canShare || busy) return;
    setBusy(true);
    try {
      const out = await renderPng();
      if (!out) throw new Error("ไม่สามารถสร้างรูปได้");
      const link = document.createElement("a");
      link.href = out.dataUrl;
      link.download = `${match.name.replace(/\s+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("บันทึกรูปแล้ว");
    } catch (e) {
      toast.error(`บันทึกไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!canShare || busy) return;
    setBusy(true);
    try {
      const out = await renderPng();
      if (!out) throw new Error("ไม่สามารถสร้างรูปได้");
      const file = new File([out.blob], `${match.name}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: match.name, text: match.reason ?? match.name });
        toast.success("ส่งไปแชร์แล้ว");
      } else {
        const link = document.createElement("a");
        link.href = out.dataUrl;
        link.download = `${match.name.replace(/\s+/g, "-")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info("บันทึกรูปแล้ว เปิด IG → สตอรี่ แล้วเลือกรูปได้เลย");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      toast.error(`แชร์ไม่สำเร็จ: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function onPickPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">แชร์ชุดของคุณ</h2>
            <p className="text-xs text-muted-foreground truncate">{match.name}</p>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0"
            aria-label="ปิด"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 shrink-0">
          <div className="bg-muted rounded-full p-1 flex">
            <TabButton active={tab === "infographic"} onClick={() => setTab("infographic")}>
              <ImageIcon className="size-4" /> อินโฟกราฟิก
            </TabButton>
            <TabButton active={tab === "photo"} onClick={() => setTab("photo")}>
              <Camera className="size-4" /> รูปจริง
            </TabButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "infographic" ? (
            <div className="flex justify-center">
              <InfographicCard ref={infoRef} match={match} items={resolved} />
            </div>
          ) : photo ? (
            <div className="flex flex-col items-center gap-3">
              <PhotoCard ref={photoRef} match={match} items={resolved} photo={photo} />
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs font-semibold text-primary underline underline-offset-4"
              >
                เลือกรูปใหม่
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[9/16] max-h-[400px] mx-auto border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/40 transition"
            >
              <Camera className="size-10" />
              <p className="text-sm font-semibold text-foreground/80">ถ่ายรูปชุดที่แต่งจริง</p>
              <p className="text-xs">หรือเลือกจากแกลเลอรี</p>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickPhoto(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="p-5 pt-3 border-t border-border/40 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!canShare || busy}
              className="flex-1 h-12 rounded-full bg-muted hover:bg-border text-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
              <Download className="size-4" /> บันทึก
            </button>
            <button
              onClick={handleShare}
              disabled={!canShare || busy}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
            >
              <Share2 className="size-4" /> แชร์ไปสตอรี่
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            เปิดในแอป IG → สตอรี่ → เพิ่มรูปได้เลย
          </p>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-10 rounded-full flex items-center justify-center gap-2 text-sm font-semibold transition ${
        active ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function InfographicCard({
  ref,
  match,
  items,
}: {
  ref?: React.Ref<HTMLDivElement>;
  match: Match;
  items: WardrobeItem[];
}) {
  return (
    <div
      ref={ref}
      className="w-[270px] aspect-[9/16] rounded-3xl overflow-hidden flex flex-col p-5 gap-3 relative"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.92 0.06 5) 0%, oklch(0.88 0.08 295) 50%, oklch(0.9 0.06 245) 100%)",
      }}
    >
      <div className="self-start bg-white/80 rounded-full px-2.5 py-1 flex items-center gap-1 text-[10px] font-semibold text-foreground/80">
        <Sparkles className="size-3 text-lilac-foreground" /> AI Stylist
      </div>

      <h3 className="text-xl font-bold leading-tight text-foreground">{match.name}</h3>

      {match.occasion && (
        <span className="self-start bg-white/70 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-foreground/80">
          {match.occasion}
        </span>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {items.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="aspect-square rounded-xl bg-white/85 flex items-center justify-center overflow-hidden"
          >
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">{item.emoji}</span>
            )}
          </div>
        ))}
      </div>

      {match.reason && (
        <div className="bg-white/80 rounded-2xl px-3 py-2.5 mt-1">
          <p className="text-[10px] leading-snug text-foreground/85 font-medium">{match.reason}</p>
        </div>
      )}

      <div className="mt-auto">
        <p className="text-[9px] font-semibold text-foreground/60">
          จัดชุดโดย AI Stylist · Digital Wardrobe
        </p>
      </div>
    </div>
  );
}

function PhotoCard({
  ref,
  match,
  items,
  photo,
}: {
  ref?: React.Ref<HTMLDivElement>;
  match: Match;
  items: WardrobeItem[];
  photo: string;
}) {
  return (
    <div
      ref={ref}
      className="w-[270px] aspect-[9/16] rounded-3xl overflow-hidden relative bg-muted"
    >
      <img src={photo} alt="outfit" className="w-full h-full object-cover" />

      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2 bg-gradient-to-t from-black/55 via-black/25 to-transparent text-white">
        <h3 className="text-lg font-bold leading-tight drop-shadow">{match.name}</h3>
        {match.occasion && (
          <p className="text-[11px] font-semibold opacity-90 -mt-1">· {match.occasion}</p>
        )}
        <div className="flex gap-1.5">
          {items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="size-9 rounded-xl bg-white/85 flex items-center justify-center overflow-hidden shrink-0"
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">{item.emoji}</span>
              )}
            </div>
          ))}
        </div>
        <span className="self-start bg-white/85 text-foreground rounded-full px-2 py-0.5 flex items-center gap-1 text-[10px] font-semibold">
          <Sparkles className="size-3 text-lilac-foreground" /> AI Stylist
        </span>
      </div>
    </div>
  );
}
