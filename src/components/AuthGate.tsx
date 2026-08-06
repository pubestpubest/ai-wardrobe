import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Shirt, CalendarHeart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const PERKS = [
  {
    icon: Sparkles,
    tone: "bg-lilac text-lilac-foreground",
    text: "AI สไตลิสต์จัดชุดให้จากตู้ของคุณ",
  },
  {
    icon: Shirt,
    tone: "bg-blush text-blush-foreground",
    text: "ถ่ายรูป แล้วให้ AI กรอกแท็กให้เอง",
  },
  { icon: CalendarHeart, tone: "bg-sky text-sky-foreground", text: "บันทึกว่าวันไหนใส่ชุดอะไร" },
];

// The showcase panel is desktop-only. `hidden lg:flex` alone still makes phones
// download the 220KB mockup — display:none does not stop <img> from fetching —
// so the panel is gated on the same 1024px breakpoint instead of just hidden.
function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return wide;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, signIn, signUp } = useAuth();
  const isWide = useIsWide();
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[linear-gradient(130deg,#FDFCFD,#F7F2FC,#FDF5F9,#F3F7FD,#F8F4FC,#FDFCFD)]">
      {/* Ambient pastel layers — decorative only */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-24 -left-20 size-72 rounded-full bg-lilac/50 blur-3xl" />
        <div
          className="animate-drift absolute top-1/3 -right-24 size-80 rounded-full bg-blush/45 blur-3xl"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="animate-drift absolute -bottom-28 left-1/4 size-72 rounded-full bg-sky/45 blur-3xl"
          style={{ animationDelay: "-8s" }}
        />
      </div>

      <div className="relative min-h-full mx-auto max-w-6xl px-5 py-8 grid lg:grid-cols-2 gap-10 items-center">
        {/* ── Showcase (desktop only — not rendered at all on phones) ── */}
        {isWide && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/images/MATCHME.png"
                alt=""
                className="size-14 rounded-2xl shadow-lg shadow-lilac/40"
              />
              <div>
                <p className="text-2xl font-bold tracking-tight leading-none">MATCHME</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ตู้เสื้อผ้าดิจิทัล + AI สไตลิสต์
                </p>
              </div>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              แมตช์ลุคที่ใช่
              <br />
              <span className="text-primary">จากตู้เสื้อผ้าที่คุณมี</span>
            </h1>

            <div className="flex flex-col gap-2.5">
              {PERKS.map(({ icon: Icon, tone, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className={`size-9 rounded-xl ${tone} flex items-center justify-center`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground/80">{text}</span>
                </div>
              ))}
            </div>

            <img
              src="/images/15_MATCHME.png"
              alt="ตัวอย่างหน้าจอแอป MATCHME"
              className="w-64 self-center drop-shadow-2xl -mt-2"
            />
          </div>
        )}

        {/* ── Auth card ── */}
        <div className="glass w-full max-w-md mx-auto rounded-3xl border border-white/60 shadow-xl shadow-lilac/20 p-6 flex flex-col gap-5">
          {/* Brand — mobile only, desktop has the showcase panel */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <img
              src="/images/MATCHME.png"
              alt=""
              className="size-16 rounded-2xl shadow-lg shadow-lilac/40"
            />
            <p className="text-lg font-bold tracking-tight">MATCHME</p>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {mode === "signin" ? "ยินดีต้อนรับกลับมา ✨" : "มาเริ่มจัดตู้กันเลย 👗"}
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
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="you@example.com"
                className="bg-white/70 border border-border/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary transition"
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
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="••••••"
                className="bg-white/70 border border-border/50 rounded-xl px-3 py-2.5 text-sm tracking-[0.3em] outline-none focus:ring-2 ring-primary transition"
              />
            </label>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-semibold shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none transition mt-2"
            >
              {submitting ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 mt-1 transition"
            >
              {mode === "signin" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
