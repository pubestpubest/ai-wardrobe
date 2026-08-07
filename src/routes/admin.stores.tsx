import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Ban, CheckCircle2, ShieldAlert, Store as StoreIcon } from "lucide-react";
import { useAdminStores } from "@/hooks/use-admin-stores";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { STORE_PACKAGES, type StorePackage } from "@/lib/wardrobe";

// No admin.tsx layout — this is the only admin route today, and the
// flat-file router only turns a file into a layout once a sibling shares its
// prefix (see store.tsx's comment for the same reasoning). Add one only if a
// second /admin/* route arrives.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/admin/stores")({
  component: AdminStoresPage,
  head: () => ({
    meta: [{ title: "จัดการร้านค้า · Digital Wardrobe" }],
  }),
});

function AdminStoresPage() {
  const { stores, isLoading, isError, setPackage, setStatus, isSettingPackage, isSettingStatus } =
    useAdminStores();
  // useIsAdmin() carries the same disabled-query load state every store hook
  // has had to account for (B12b-L2/L3) but exposes no isLoading of its own,
  // so it can briefly read `false` for a real admin whose session just
  // resolved. Checked here, after useAdminStores' own isLoading has already
  // settled — not a hard security gate, just UX: every write below goes
  // through setStorePackage/setStoreStatus, both of which call assertAdmin
  // first and fail closed server-side no matter what this component renders
  // (B16-L1 plan). Unlike B12b-L2's bug (a permanent mis-redirect), a
  // mistimed read here self-corrects on the next render.
  const isAdmin = useIsAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD] text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  // Checked BEFORE isError, not after: listStoresForAdmin calls assertAdmin
  // first, so a non-admin's fetch ALWAYS errors — isError first would swallow
  // the authorization case behind "โหลดข้อมูลร้านค้าไม่สำเร็จ / ลองใหม่", which
  // reloads into the identical failure forever (same shape as B14a-L1's
  // non-UUID-id finding on /store/$id). A real admin hitting a genuine fetch
  // failure still reaches the isError branch below, since isAdmin is true.
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FDFCFD] px-6 text-center">
        <ShieldAlert className="size-10 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
      </div>
    );
  }

  // A failed fetch must not fall through to the empty/content branches below
  // — same reasoning as every other store page (B12b-L3).
  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FDFCFD] px-6 text-center">
        <p className="text-sm text-muted-foreground">โหลดข้อมูลร้านค้าไม่สำเร็จ</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FDFCFD] px-6 text-center">
        <StoreIcon className="size-10 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">ยังไม่มีร้านค้าในระบบ</p>
      </div>
    );
  }

  async function handlePackageChange(id: string, pkg: StorePackage) {
    try {
      await setPackage(id, pkg);
      toast.success("เปลี่ยนแพ็กเกจแล้ว");
    } catch {
      // useAdminStores' onError already toasts with context.
    }
  }

  async function handleStatusToggle(id: string, current: "approved" | "suspended") {
    try {
      await setStatus(id, current === "approved" ? "suspended" : "approved");
      toast.success(current === "approved" ? "ระงับร้านค้าแล้ว" : "เปิดใช้งานร้านค้าแล้ว");
    } catch {
      // useAdminStores' onError already toasts with context.
    }
  }

  return (
    <div className="min-h-screen pb-16 bg-[#FDFCFD]">
      <div className="mx-auto max-w-3xl px-5 pt-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">จัดการร้านค้า</h1>
        <p className="text-xs text-muted-foreground mb-6">{stores.length} ร้านค้าในระบบ</p>

        <div className="flex flex-col gap-3">
          {stores.map((s) => {
            const pkg = STORE_PACKAGES[s.package];
            // An admin may have downgraded a store below its current item
            // count on purpose — allowed, it just can't add more until back
            // under the new cap (LOCAL-STORE.md, B16-L1 plan item 2).
            const overCap = s.itemCount > pkg.maxItems;

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-border/40 shadow-sm p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground/80 truncate">{s.name}</p>
                  <p
                    className={`text-xs mt-0.5 ${overCap ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {s.itemCount} / {pkg.maxItems} ไอเท็ม
                    {s.status === "suspended" && " · ระงับชั่วคราว"}
                    {!s.ownerUserId && " · ยังไม่มีเจ้าของ"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={s.package}
                    disabled={isSettingPackage}
                    onChange={(e) => handlePackageChange(s.id, e.target.value as StorePackage)}
                    className="bg-muted rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 ring-primary disabled:opacity-50"
                  >
                    {(Object.keys(STORE_PACKAGES) as StorePackage[]).map((p) => (
                      <option key={p} value={p}>
                        {STORE_PACKAGES[p].label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleStatusToggle(s.id, s.status)}
                    disabled={isSettingStatus}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                      s.status === "approved"
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                        : "bg-lilac text-lilac-foreground hover:opacity-90"
                    }`}
                  >
                    {s.status === "approved" ? (
                      <>
                        <Ban className="size-3.5" /> ระงับ
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" /> เปิดใช้งาน
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
