import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { MatchCard } from "@/components/MatchCard";
import { useMatches } from "@/hooks/use-matches";
import { useWardrobe } from "@/hooks/use-wardrobe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/matches")({
  component: MatchesPage,
  head: () => ({
    meta: [
      { title: "แมตช์โปรด · Digital Wardrobe" },
      { name: "description", content: "ชุดที่บันทึกไว้และที่ AI แนะนำ" },
    ],
  }),
});

function MatchesPage() {
  const { matches, isLoading, remove } = useMatches();
  const { items } = useWardrobe();

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">แมตช์โปรด</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{matches.length} ชุดที่บันทึกไว้</p>
          </div>
        </header>

        {isLoading ? (
          <div className="py-24 text-center text-sm text-muted-foreground">กำลังโหลด...</div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} items={items} onDelete={remove} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 grayscale opacity-40">
              <Heart className="size-10" />
            </div>
            <p className="text-base font-bold text-foreground/80">ยังไม่มีแมตช์ที่บันทึก</p>
            <p className="text-sm opacity-60 mt-1">
              เลือกเสื้อผ้าหลายชิ้นจากตู้ หรือถาม AI Stylist แล้วกดบันทึก
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
