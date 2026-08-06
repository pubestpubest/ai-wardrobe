import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { localDateKey, type Match, type OutfitWear, type WardrobeItem } from "@/lib/wardrobe";

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_LABELS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

interface Props {
  wears: OutfitWear[];
  matches: Match[];
  items: WardrobeItem[];
}

export function OutfitCalendar({ wears, matches, items }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // Controlled rather than relying on Radix's own hover trigger: it guards
  // pointerenter against touch, so a tap would never open the detail on mobile.
  const [openKey, setOpenKey] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // One wear per day (enforced by the unique index in migration 017), so this
  // is a plain date → wear map, not a list.
  const wearByDate = useMemo(() => {
    const map = new Map<string, OutfitWear>();
    for (const w of wears) map.set(w.wornDate, w);
    return map;
  }, [wears]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const todayKey = localDateKey();

  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, key: localDateKey(new Date(year, month, d)) });

  const goPrev = () => {
    setOpenKey(null);
    setCursor(new Date(year, month - 1, 1));
  };
  const goNext = () => {
    setOpenKey(null);
    setCursor(new Date(year, month + 1, 1));
  };

  return (
    <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goPrev}
          aria-label="เดือนก่อนหน้า"
          className="size-8 rounded-full bg-muted flex items-center justify-center hover:opacity-80 transition"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-bold text-foreground/90">
          {MONTH_LABELS[month]} {year}
        </p>
        <button
          type="button"
          onClick={goNext}
          aria-label="เดือนถัดไป"
          className="size-8 rounded-full bg-muted flex items-center justify-center hover:opacity-80 transition"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={`blank-${idx}`} />;

          const wear = wearByDate.get(cell.key);
          const isToday = cell.key === todayKey;
          const match = wear?.matchId ? matchById.get(wear.matchId) : undefined;
          const outfit = (match?.itemIds ?? [])
            .map((id) => itemById.get(id))
            .filter(Boolean) as WardrobeItem[];
          const preview = outfit.find((i) => i.imageUrl);

          // Empty day — no detail to open, so render a plain cell.
          if (!wear) {
            return (
              <div
                key={cell.key}
                className={`aspect-square rounded-xl flex items-center justify-center bg-muted/40 ${
                  isToday ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className="text-[11px] font-semibold text-foreground/80">{cell.day}</span>
              </div>
            );
          }

          return (
            <HoverCard
              key={cell.key}
              open={openKey === cell.key}
              onOpenChange={(o) => setOpenKey(o ? cell.key : null)}
            >
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  // Open eagerly on hover and on tap (Radix guards its own
                  // pointerenter against touch). Closing is left to Radix via
                  // onOpenChange — an eager onPointerLeave here would fire while
                  // crossing the sideOffset gap and shut the card before the
                  // pointer reached it.
                  onPointerEnter={() => setOpenKey(cell.key)}
                  onClick={() => setOpenKey((k) => (k === cell.key ? null : cell.key))}
                  aria-label={`${cell.day} — ${match?.name ?? "ชุดที่ถูกลบ"}`}
                  className={`relative aspect-square w-full rounded-xl overflow-hidden bg-lilac flex items-center justify-center hover:ring-2 hover:ring-primary/50 transition ${
                    isToday ? "ring-2 ring-primary" : ""
                  }`}
                >
                  {preview ? (
                    <img
                      src={preview.imageUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg leading-none opacity-80">
                      {outfit[0]?.emoji ?? (match ? "👗" : "🗑️")}
                    </span>
                  )}
                  <span className="absolute top-0.5 left-0.5 z-10 min-w-4 px-1 rounded-md bg-black/55 text-white text-[10px] font-bold leading-4 text-center">
                    {cell.day}
                  </span>
                </button>
              </HoverCardTrigger>

              <HoverCardContent align="center" className="w-60 p-3">
                <p className="text-sm font-bold text-foreground/90 truncate">
                  {match?.name ?? "ชุดที่ถูกลบไปแล้ว"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {cell.day} {MONTH_LABELS[month]} {year}
                  {match?.occasion ? ` · ${match.occasion}` : ""}
                </p>

                {outfit.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                      {outfit.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden"
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">{item.emoji}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {outfit.length} ไอเท็ม
                      {outfit.length > 6 ? ` (แสดง 6)` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {match
                      ? "ไอเท็มในชุดนี้ถูกลบไปแล้ว"
                      : "แมตช์นี้ถูกลบ แต่ยังบันทึกว่าใส่ชุดวันนี้"}
                  </p>
                )}

                {match?.note && (
                  <p className="text-[11px] text-foreground/70 mt-2 line-clamp-3">{match.note}</p>
                )}
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </div>

      {wears.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <CalendarDays className="size-8 mb-2 opacity-40" />
          <p className="text-xs">ยังไม่มีการบันทึกว่าใส่ชุดไหนวันไหน</p>
          <p className="text-[11px] opacity-60 mt-0.5">กด "ใส่ชุดนี้วันนี้" ที่แมตช์ที่บันทึกไว้</p>
        </div>
      )}
    </div>
  );
}
