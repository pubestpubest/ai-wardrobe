import { useSyncExternalStore } from "react";
import { LogIn, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  closeGuestGate,
  getGuestGateServerSnapshot,
  getGuestGateSnapshot,
  subscribeGuestGate,
} from "@/lib/guest-gate";

export function GuestGateModal() {
  const action = useSyncExternalStore(
    subscribeGuestGate,
    getGuestGateSnapshot,
    getGuestGateServerSnapshot,
  );
  const { signOut } = useAuth();
  if (action === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">ต้องเข้าสู่ระบบก่อน</h2>
            <p className="text-xs text-muted-foreground mt-1">
              คุณกำลังใช้งานแบบผู้เยี่ยมชม ดูได้อย่างเดียว
              {action ? ` — ${action}ต้องมีบัญชีของคุณเอง` : " — การแก้ไขต้องมีบัญชีของคุณเอง"}
            </p>
          </div>
          <button
            onClick={closeGuestGate}
            aria-label="ปิด"
            className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Signing out IS the redirect: AuthGate replaces the app with the
            sign-in screen the moment the session goes away, so there is no
            route to navigate to. */}
        <button
          onClick={async () => {
            closeGuestGate();
            await signOut();
          }}
          className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <LogIn className="size-4" /> เข้าสู่ระบบ / สมัครสมาชิก
        </button>
        <button
          onClick={closeGuestGate}
          className="text-xs text-muted-foreground hover:text-foreground transition"
        >
          ดูต่อแบบผู้เยี่ยมชม
        </button>
      </div>
    </div>
  );
}
