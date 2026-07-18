import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, signIn, signUp } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  // SSR + until auth state is known → render the app (preserves SSR; mirrors
  // the flash-of-app tradeoff ProfileGate already accepts).
  if (!mounted || loading) return <>{children}</>;
  if (session) return <>{children}</>;

  const pinValid = /^\d{6}$/.test(pin);
  const canSubmit = email.trim().length > 0 && pinValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), pin);
      } else {
        await signUp(email.trim(), pin);
        toast.success("สมัครสมาชิกสำเร็จ");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            ใช้อีเมลและรหัส PIN 6 หลักเพื่อเข้าใช้งานตู้เสื้อผ้าของคุณ
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">อีเมล</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">รหัส PIN (6 หลัก)</span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="bg-muted rounded-lg px-3 py-2 text-sm tracking-[0.3em] outline-none focus:ring-2 ring-primary"
            />
          </label>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium disabled:opacity-40 mt-2"
          >
            {mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-muted-foreground underline underline-offset-2 mt-1"
          >
            {mode === "signin" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"}
          </button>
        </div>
      </div>
    </div>
  );
}
