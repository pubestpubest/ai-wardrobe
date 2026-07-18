import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Match, OutfitWear } from "@/lib/wardrobe";

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

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

interface Props {
  wears: OutfitWear[];
  matches: Match[];
}

export function OutfitCalendar({ wears, matches }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const matchNameById = useMemo(() => new Map(matches.map((m) => [m.id, m.name])), [matches]);

  const wearsByDate = useMemo(() => {
    const map = new Map<string, OutfitWear[]>();
    for (const w of wears) {
      const list = map.get(w.wornDate) ?? [];
      list.push(w);
      map.set(w.wornDate, list);
    }
    return map;
  }, [wears]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const now = new Date();
  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: toDateKey(year, month, d) });

  const goPrev = () => setCursor(new Date(year, month - 1, 1));
  const goNext = () => setCursor(new Date(year, month + 1, 1));

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
          const dayWears = wearsByDate.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;
          const firstName =
            dayWears.length > 0 ? matchNameById.get(dayWears[0].matchId) : undefined;
          return (
            <div
              key={cell.key}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-center px-0.5 ${
                dayWears.length > 0 ? "bg-lilac" : "bg-muted/40"
              } ${isToday ? "ring-2 ring-primary" : ""}`}
            >
              <span className="text-[11px] font-semibold text-foreground/80">{cell.day}</span>
              {dayWears.length > 0 && (
                <span className="text-[9px] leading-tight text-lilac-foreground/80 truncate max-w-full px-0.5">
                  {firstName ?? "ชุด"}
                  {dayWears.length > 1 ? ` +${dayWears.length - 1}` : ""}
                </span>
              )}
            </div>
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
