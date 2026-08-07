import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { EMPTY_STORE_DRAFT, StoreForm } from "@/components/StoreForm";
import { StoreBottomNav } from "@/components/StoreBottomNav";

// Nested under store.tsx's layout (that file exists purely so /store/register
// and /store/package can be children of it in the router tree — TanStack's
// flat-file convention makes store.tsx a layout the instant those sibling
// files share its prefix). This file supplies the exact-match /store content.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/store/")({
  component: StorePage,
  head: () => ({
    meta: [{ title: "ร้านค้า · Digital Wardrobe" }],
  }),
});

function StorePage() {
  const { store, isLoading, isError, create, isCreating, update, isUpdating } = useStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD] text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  // A failed fetch must NOT fall through to the no-store branch below —
  // "you have no store" and "we couldn't load your store" look identical
  // otherwise, and the latter would show a real owner the registration form.
  if (isError) {
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

  // No `stores` row yet: a role='store' account whose registration partially
  // failed, or any signed-in visitor who lands here directly. Render the same
  // registration form as /store/register instead of dead-ending
  // (LOCAL-STORE.md §2 — "/store renders the registration form whenever
  // role='store' and no stores row exists, so the shell can never dead-end").
  // No StoreBottomNav here: there is no shell to show nav for yet.
  if (!store) {
    return (
      <div className="min-h-screen bg-[#FDFCFD] px-5 py-10">
        <StoreForm
          heading="สมัครร้านค้า"
          subheading="ลงทะเบียนร้านค้าของคุณเพื่อแสดงในหน้าช้อปปิ้งของ Digital Wardrobe"
          initial={EMPTY_STORE_DRAFT}
          submitLabel="สมัครร้านค้า"
          submittingLabel="กำลังสมัคร…"
          submitting={isCreating}
          onSubmit={async (payload) => {
            try {
              await create(payload);
              toast.success("สมัครร้านค้าสำเร็จ");
            } catch {
              // useStore's onError already toasts with context.
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-[#FDFCFD] px-5 py-8">
      {/* key=store.id remounts StoreForm with fresh `initial` whenever the
          loaded store changes identity (e.g. account switch) — simpler than
          syncing local draft state to a prop via an effect. */}
      <StoreForm
        key={store.id}
        heading="ข้อมูลร้านค้า"
        subheading="แก้ไขข้อมูลร้านของคุณที่แสดงในหน้าช้อปปิ้ง"
        initial={store}
        submitLabel="บันทึก"
        submittingLabel="กำลังบันทึก…"
        submitting={isUpdating}
        onSubmit={async (payload) => {
          try {
            await update(payload);
            toast.success("บันทึกข้อมูลร้านค้าแล้ว");
          } catch {
            // useStore's onError already toasts with context.
          }
        }}
      />
      <StoreBottomNav />
    </div>
  );
}
