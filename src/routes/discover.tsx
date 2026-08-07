import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowRight,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Store as StoreIcon,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateItemModal } from "@/components/AffiliateItemModal";
import { AffiliateEditModal } from "@/components/AffiliateEditModal";
import { GridSkeleton } from "@/components/GridSkeleton";
import { useDiscoverStores, type DiscoverStore } from "@/hooks/use-discover-stores";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_LABELS,
  STORE_PACKAGES,
  weightedShuffle,
  type AffiliateProduct,
} from "@/lib/wardrobe";

const TONES = ["bg-lilac", "bg-blush", "bg-sky"] as const;
const PREVIEW_CAP = 6;

const CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  ...(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
  })),
];

const norm = (s: string) => (s ?? "").replace(/\s+/g, "").toLowerCase();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/discover")({
  component: DiscoverPage,
  head: () => ({
    meta: [
      { title: "ช้อปปิ้ง · Digital Wardrobe" },
      { name: "description", content: "ไอเท็มแนะนำจากร้านค้าพาร์ทเนอร์" },
    ],
  }),
});

// weightedShuffle/mulberry32 moved to src/lib/wardrobe.ts (B15-L1) — shared
// with the AI recommendation pool so both agree on what a package tier is
// worth. Seed comes from useState below, fixed for the mount, which is what
// lets useMemo hold the order stable across re-renders (LOCAL-STORE.md §5 /
// B14b-L1 grill: must not reshuffle while typing or on a background refetch).

type CardEntry = { store: DiscoverStore; items: AffiliateProduct[] };

function DiscoverPage() {
  const { stores, hasData, isLoading, isError } = useDiscoverStores();
  const isAdmin = useIsAdmin();
  const [viewing, setViewing] = useState<AffiliateProduct | null>(null);
  const [editing, setEditing] = useState<AffiliateProduct | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Held for the life of the mount — see weightedShuffle's comment above.
  const [seed] = useState(() => Math.random());

  const orderedStores = useMemo(
    () => weightedShuffle(stores, (s) => STORE_PACKAGES[s.package].weight, seed),
    [stores, seed],
  );

  const q = norm(search);
  const cards: CardEntry[] = useMemo(() => {
    return orderedStores
      .map((store) => {
        const categoryItems = store.items.filter(
          (p) => category === "all" || p.category === category,
        );
        // A store-name hit keeps the FULL (category-filtered) item list; an
        // item-only hit narrows it further to the matching items
        // (LOCAL-STORE.md §5 — once a shop's name is the largest text on the
        // card, typing it and finding nothing reads as a bug).
        const nameHit = q !== "" && norm(store.name).includes(q);
        const items =
          q === "" || nameHit
            ? categoryItems
            : categoryItems.filter(
                (p) => norm(p.name).includes(q) || norm(p.description ?? "").includes(q),
              );
        return { store, items };
      })
      .filter((entry) => entry.items.length > 0);
  }, [orderedStores, q, category]);

  const hasFilters = search !== "" || category !== "all";

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
  };

  const totalItemsShown = cards.reduce((sum, e) => sum + e.items.length, 0);

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="mx-auto max-w-6xl px-5 pt-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ช้อปปิ้งไอเท็ม</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isLoading
                ? "กำลังโหลด…"
                : isError
                  ? "\u2014"
                  : `${totalItemsShown} รายการจากร้านค้าพาร์ทเนอร์`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setAdding(true)}
              className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <Plus className="size-4" /> เพิ่มไอเท็ม
            </button>
          )}
        </header>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search className="size-4" />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาร้านค้าหรือไอเท็ม..."
            className="pl-10 h-12 bg-white border-none shadow-sm rounded-2xl focus-visible:ring-lilac/50"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-none -mx-5 px-5 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-5 py-2.5 rounded-3xl text-sm font-semibold whitespace-nowrap transition-all duration-300 active:scale-95 ${
                category === cat.id
                  ? "bg-lilac text-lilac-foreground shadow-lg shadow-lilac/30 -translate-y-0.5"
                  : "bg-white text-muted-foreground border border-border/40 hover:bg-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Four states, in order (B12b-L2's established shape): loading →
            error → no-stores-at-all → content. */}
        {isLoading ? (
          <GridSkeleton count={3} className="flex flex-col gap-4" tile="h-44" lines={1} />
        ) : isError && !hasData ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 grayscale opacity-40">
              <ShoppingBag className="size-10" />
            </div>
            <p className="text-base font-bold text-foreground/80">โหลดข้อมูลร้านค้าไม่สำเร็จ</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-muted rounded-full text-xs font-bold hover:bg-border transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 grayscale opacity-40">
              <ShoppingBag className="size-10" />
            </div>
            <p className="text-base font-bold text-foreground/80">ยังไม่มีร้านค้าแนะนำ</p>
            <p className="text-sm opacity-60 mt-1">กลับมาเช็คใหม่เร็ว ๆ นี้</p>
          </div>
        ) : cards.length > 0 ? (
          <div className="flex flex-col gap-4">
            {cards.map(({ store, items }, i) => {
              const shown = items.slice(0, PREVIEW_CAP);
              // Gated and labelled on the store's FULL catalog, not the filtered
              // view: this is a navigation affordance, so it must describe where
              // it goes. Using the filtered count hid the link entirely whenever
              // a search or chip was active — and for admin-created items (which
              // always carry an affiliateUrl, so the modal shows the external
              // link instead of ดูที่ร้าน) that was the ONLY route from Discover
              // to /store/$id, which is the page B14b exists to make reachable.
              const hasMore = store.items.length > shown.length;
              const pkg = STORE_PACKAGES[store.package];
              return (
                <div
                  key={store.id}
                  // Stagger only when unfiltered — see wardrobe.tsx for why.
                  style={
                    { "--d": `${hasFilters ? 0 : Math.min(i, 7) * 35}ms` } as React.CSSProperties
                  }
                  className="rise bg-white rounded-3xl border border-border/40 shadow-sm p-4 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl overflow-hidden bg-lilac/20 flex items-center justify-center shrink-0">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <StoreIcon className="size-5 text-lilac-foreground/70" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-foreground truncate flex-1 min-w-0">
                      {store.name}
                    </p>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lilac text-lilac-foreground text-[10px] font-semibold">
                      <Package className="size-3" /> {pkg.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {shown.map((p, itemIdx) => (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setViewing(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setViewing(p);
                          }
                        }}
                        className="relative text-left bg-muted/40 rounded-2xl p-2 flex flex-col gap-1.5 transition hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                      >
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(p);
                            }}
                            className="absolute top-1 right-1 z-10 size-6 rounded-full bg-white/90 shadow-md flex items-center justify-center"
                            aria-label="แก้ไข"
                          >
                            <Pencil className="size-3" />
                          </button>
                        )}
                        <div
                          className={`aspect-square rounded-xl ${TONES[itemIdx % 3]} flex items-center justify-center overflow-hidden`}
                        >
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl">{p.emoji}</span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-foreground/80 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] font-semibold text-foreground/70">
                          {p.price.toLocaleString("th-TH")} บาท
                        </p>
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <Link
                      to="/store/$id"
                      params={{ id: store.id }}
                      className="self-end text-xs font-semibold text-lilac-foreground flex items-center gap-1"
                    >
                      ดูทั้งหมด ({store.items.length}) <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <div className="size-24 rounded-[2.5rem] bg-white shadow-inner flex items-center justify-center mb-6 grayscale opacity-40">
              <ShoppingBag className="size-10" />
            </div>
            <p className="text-base font-bold text-foreground/80">ไม่พบไอเท็มที่ค้นหา</p>
            <p className="text-sm opacity-60 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองดูนะ</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-6 px-6 py-2 bg-muted rounded-full text-xs font-bold hover:bg-border transition-colors"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />
      <AffiliateItemModal item={viewing} onClose={() => setViewing(null)} />
      {isAdmin && (
        <AffiliateEditModal
          product={editing}
          open={editing !== null || adding}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}
