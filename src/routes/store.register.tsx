import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useStore } from "@/hooks/use-store";
import { EMPTY_STORE_DRAFT, StoreForm } from "@/components/StoreForm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/store/register")({
  component: StoreRegisterPage,
  head: () => ({
    meta: [
      { title: "สมัครร้านค้า · Digital Wardrobe" },
      { name: "description", content: "ลงทะเบียนร้านค้าท้องถิ่นบน Digital Wardrobe" },
    ],
  }),
});

function StoreRegisterPage() {
  const { store, isLoading, create, isCreating } = useStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFD]/75 text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  // Idempotent on revisit: a store already registered redirects straight to
  // the profile editor (B12b-L1 plan item 7) — there is now somewhere to
  // land, instead of B12a's dead-end success panel.
  if (store) {
    return <Navigate to="/store" replace />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCFD]/75 px-5 py-10">
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
            // useStore's onError already toasts with context — don't double-toast.
          }
        }}
        footer={
          <Link
            to="/"
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 text-center mt-1 transition"
          >
            กลับหน้าแรก
          </Link>
        }
      />
    </div>
  );
}
