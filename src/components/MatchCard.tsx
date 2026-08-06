import { CalendarCheck, CalendarX, Share2, Sparkles, Wand2 } from "lucide-react";
import type { Match, WardrobeItem } from "@/lib/wardrobe";
import { cn } from "@/lib/utils";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;

interface Props {
  match: Match;
  items: WardrobeItem[];
  onClick?: () => void;
  onShare?: () => void;
  onTryOn?: () => void;
  onWearToday?: (match: Match) => void;
  /** This match is the outfit logged for today — button reads as "un-set". */
  wornToday?: boolean;
  /** A toggle is in flight; blocks the double-tap that would race two upserts. */
  wearPending?: boolean;
  /** Grid entrance animation — callers pass `rise` plus a `--d` stagger. */
  className?: string;
  style?: React.CSSProperties;
}

export function MatchCard({
  match,
  items,
  onClick,
  onShare,
  onTryOn,
  onWearToday,
  wornToday = false,
  wearPending = false,
  className,
  style,
}: Props) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const resolved = match.itemIds.map((id) => byId.get(id)).filter(Boolean) as WardrobeItem[];

  return (
    // h-full + flex column so the action row can be pinned to the bottom: grid
    // stretches every card to the tallest in its row, and cards without a
    // reason/note would otherwise leave dead space under their buttons.
    <div
      style={style}
      className={cn(
        "h-full flex flex-col bg-white rounded-3xl border border-border/40 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition group",
        className,
      )}
    >
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="grid grid-cols-3 gap-1 p-3 bg-muted/30">
          {resolved.slice(0, 6).map((item, idx) => (
            <div
              key={item.id}
              className={`aspect-square rounded-2xl ${TONES[idx % 3]} flex items-center justify-center overflow-hidden`}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{item.emoji}</span>
              )}
            </div>
          ))}
          {resolved.length === 0 && (
            <div className="col-span-3 aspect-[3/1] flex items-center justify-center text-xs text-muted-foreground">
              ไอเท็มถูกลบไปแล้ว
            </div>
          )}
        </div>

        <div className="p-4 pb-3">
          <div className="flex items-center gap-1.5">
            {match.source === "ai" && (
              <Sparkles className="size-3.5 text-lilac-foreground/70 shrink-0" />
            )}
            <p className="text-sm font-bold leading-tight text-foreground/90 truncate">
              {match.name}
            </p>
          </div>
          <p className="text-[11px] font-medium text-muted-foreground mt-1">
            {resolved.length} ไอเท็ม{match.occasion ? ` · ${match.occasion}` : ""}
          </p>
          {match.reason && (
            <p className="text-[11px] text-muted-foreground/80 mt-2 line-clamp-2 italic">
              {match.reason}
            </p>
          )}
          {match.note && (
            <p className="text-[11px] text-foreground/70 mt-1 line-clamp-2">{match.note}</p>
          )}
        </div>
      </button>

      {(onShare || onTryOn || onWearToday) && (
        <div className="mt-auto px-4 pb-4 flex gap-2">
          {onWearToday && (
            <button
              type="button"
              onClick={() => onWearToday(match)}
              disabled={wearPending}
              title={wornToday ? "เอาชุดนี้ออกจากวันนี้" : "ใส่ชุดนี้วันนี้"}
              aria-label={wornToday ? "เอาชุดนี้ออกจากวันนี้" : "ใส่ชุดนี้วันนี้"}
              aria-pressed={wornToday}
              className={`size-11 shrink-0 rounded-full flex items-center justify-center transition disabled:opacity-50 ${
                wornToday
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                  : "bg-blush text-blush-foreground hover:opacity-90"
              }`}
            >
              {wornToday ? <CalendarX className="size-4" /> : <CalendarCheck className="size-4" />}
            </button>
          )}
          {onTryOn && (
            <button
              type="button"
              onClick={onTryOn}
              className="flex-1 h-11 rounded-full bg-lilac text-lilac-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Wand2 className="size-4" /> Virtual Try-On
            </button>
          )}
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="flex-1 h-11 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Share2 className="size-4" /> แชร์ไปสตอรี่
            </button>
          )}
        </div>
      )}
    </div>
  );
}
