import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Mail, Package, Sparkles } from "lucide-react";
import { useStore } from "@/hooks/use-store";
import { useAuth } from "@/hooks/use-auth";
import { StoreBottomNav } from "@/components/StoreBottomNav";
import { STORE_PACKAGES } from "@/lib/wardrobe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/store/package")({
  component: StorePackagePage,
  head: () => ({
    meta: [{ title: "บัญชี · Digital Wardrobe" }],
  }),
});

function StorePackagePage() {
  const { store, isLoading, isError } = useStore();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD]/75 text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  // A failed fetch must NOT fall through to the no-store branch below —
  // "you have no store" and "we couldn't load your store" look identical
  // otherwise, and the latter would show a real owner the registration form.
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FDFCFD]/75 px-6 text-center">
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

  // No stores row yet — nothing to show a package/quota for. /store is the
  // one page that renders the registration form for this state
  // (LOCAL-STORE.md §2); send them there instead of a dead-end.
  if (!store) {
    return <Navigate to="/store" replace />;
  }

  const pkg = STORE_PACKAGES[store.package];
  const itemCount = store.itemCount ?? 0;
  const quotaPct = Math.min(100, Math.round((itemCount / pkg.maxItems) * 100));

  const handleLogout = async () => {
    await signOut();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD]/75">
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">บัญชี</h1>

        {/* Package + quota */}
        <div className="bg-white rounded-3xl border border-border/40 shadow-sm p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-11 rounded-2xl bg-lilac text-lilac-foreground flex items-center justify-center shrink-0">
              <Package className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">แพ็กเกจปัจจุบัน</p>
              <p className="text-base font-bold">{pkg.label}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">โควตาไอเท็ม</span>
            <span className="text-xs font-semibold">
              {itemCount} / {pkg.maxItems} ไอเท็ม
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-lilac transition-all"
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>

        {/* Upgrade contact — packages are admin-assigned, no self-serve (LOCAL-STORE.md §7) */}
        <div className="bg-blush/40 rounded-3xl px-5 py-4 mb-5 flex items-center gap-3 border border-blush/60">
          <Sparkles className="size-4 text-blush-foreground/70 shrink-0" />
          <p className="text-sm text-foreground/80">
            ต้องการโควตาไอเท็มเพิ่มหรืออัปเกรดแพ็กเกจ? ติดต่อเพื่ออัปเกรด
          </p>
        </div>

        {/* Account email */}
        <div className="bg-white rounded-2xl border border-border/40 shadow-sm px-4 py-3.5 mb-5 flex items-center gap-3">
          <Mail className="size-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">อีเมลบัญชี</p>
            <p className="text-sm font-semibold truncate">{user?.email ?? "—"}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-2xl py-3 text-sm font-semibold hover:bg-destructive/15 transition"
        >
          <LogOut className="size-4" /> ออกจากระบบ
        </button>
      </div>

      <StoreBottomNav />
    </div>
  );
}
