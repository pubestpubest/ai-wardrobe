import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useStorePublic } from "@/hooks/use-store-public";
import { BottomNav } from "@/components/BottomNav";
import { CATEGORY_LABELS, STORE_PACKAGES } from "@/lib/wardrobe";

// Nested under store.tsx's layout, alongside store.index.tsx / .register /
// .package / .items — so StoreGuard's isStorePath treats this as a store
// path too and does NOT redirect a shopper away from it (LOCAL-STORE.md §2).
// This is the one /store/* page whose intended audience is shoppers, not the
// owner, so it renders the shopper BottomNav rather than StoreBottomNav.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/store/$id")({
  component: StorePublicPage,
  head: () => ({
    meta: [{ title: "ร้านค้า · Digital Wardrobe" }],
  }),
});

function StorePublicPage() {
  const { id } = Route.useParams();
  const { store, isLoading, isError } = useStorePublic(id);

  // Four states in this order (LOCAL-STORE.md / B12b-L2's established shape):
  // loading → error → not-found → content.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD] text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  // A failed fetch must NOT fall through to the not-found branch below —
  // "this store doesn't exist" and "we couldn't load it" look identical
  // otherwise (B12b-L3's lesson, same shape here).
  // `&& !store`: a background refetch failure (window-focus refetch on a flaky
  // connection) must not replace an already-rendered page with the error
  // screen. Only a first load with no data shows it.
  if (isError && !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FDFCFD] px-6 text-center">
        <p className="text-sm text-muted-foreground">โหลดข้อมูลร้านไม่สำเร็จ</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  // getStorePublic returns null for a missing id AND for a store RLS hides
  // (suspended, or simply not the caller's own) — indistinguishable on
  // purpose, both mean "nothing to show here".
  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FDFCFD] px-6 text-center">
        <p className="text-sm text-muted-foreground">ไม่พบร้านค้านี้</p>
        <Link
          to="/discover"
          className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
        >
          กลับไปหน้าช้อปปิ้ง
        </Link>
      </div>
    );
  }

  const pkg = STORE_PACKAGES[store.package];
  // `store`/`platform` describe a MARKETPLACE listing (LOCAL-STORE.md §1) and
  // must never render here — this page is a local shop's own profile, and
  // neither field is read from `store.items[n]` below.
  type ContactRow = { icon: LucideIcon; label: string };
  const contactRows: ContactRow[] = [
    store.contactPhone ? { icon: Phone, label: store.contactPhone } : null,
    store.contactLine ? { icon: MessageCircle, label: store.contactLine } : null,
    store.contactEmail ? { icon: Mail, label: store.contactEmail } : null,
    store.address ? { icon: MapPin, label: store.address } : null,
  ].filter((row): row is ContactRow => row !== null);

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]">
      <div className="relative">
        <div className="h-40 sm:h-56 w-full bg-lilac/30 overflow-hidden">
          {store.coverUrl && (
            <img src={store.coverUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        {store.logoUrl && (
          <div className="absolute -bottom-8 left-5 size-20 rounded-2xl overflow-hidden border-4 border-[#FDFCFD] bg-white shadow-md">
            <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-2xl px-5 pt-12">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
          <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-lilac text-lilac-foreground text-[11px] font-semibold">
            <Package className="size-3" /> {pkg.label}
          </span>
        </div>

        {store.description && (
          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
            {store.description}
          </p>
        )}

        {contactRows.length > 0 && (
          <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-4 mt-5 flex flex-col gap-3">
            {contactRows.map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-3">
                <Icon className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground/80">{label}</span>
              </div>
            ))}
          </div>
        )}

        {(store.googleMapUrl || store.onlineStoreUrl) && (
          <div className="flex gap-2 mt-4">
            {store.googleMapUrl && (
              <a
                href={store.googleMapUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-border/40 rounded-2xl py-2.5 text-xs font-semibold text-foreground/80 shadow-sm hover:bg-muted transition"
              >
                <MapPin className="size-3.5" /> แผนที่ <ExternalLink className="size-3" />
              </a>
            )}
            {store.onlineStoreUrl && (
              <a
                href={store.onlineStoreUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-border/40 rounded-2xl py-2.5 text-xs font-semibold text-foreground/80 shadow-sm hover:bg-muted transition"
              >
                <ShoppingBag className="size-3.5" /> ร้านค้าออนไลน์{" "}
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}

        <h2 className="text-base font-bold text-foreground mt-8 mb-4">
          ไอเท็มในร้าน ({store.items.length})
        </h2>

        {store.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {store.items.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-border/40 shadow-sm p-3 flex flex-col gap-2"
              >
                <div className="aspect-square rounded-xl bg-lilac/20 flex items-center justify-center overflow-hidden">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">{p.emoji}</span>
                  )}
                </div>
                <p className="text-sm font-bold text-foreground/80 truncate">{p.name}</p>
                <p className="text-xs font-semibold text-foreground/70">
                  {p.price.toLocaleString("th-TH")} บาท
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {CATEGORY_LABELS[p.category]}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="size-20 rounded-[2rem] bg-white shadow-inner flex items-center justify-center mb-4 grayscale opacity-40">
              <ShoppingBag className="size-8" />
            </div>
            <p className="text-sm font-bold text-foreground/80">ร้านนี้ยังไม่มีไอเท็ม</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
