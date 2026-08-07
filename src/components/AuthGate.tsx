import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sparkles, Shirt, CalendarHeart, Store, MapPin, PackageOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouterState } from "@tanstack/react-router";

// Two audiences, one product. Same layout and components throughout — only the
// accent, the art and the words change, so a shop owner who also shops doesn't
// feel like they've landed on a different brand.
// Shared read-only demo account (scripts/seed-guest.ts). Not a secret: it is
// deliberately public, and 029 makes every write it could attempt fail.
const GUEST_EMAIL = "guest@demo.test";
const GUEST_PIN = "000000";

const AUDIENCES = {
  customer: {
    accent: "bg-primary text-primary-foreground shadow-primary/25",
    chip: "bg-lilac text-lilac-foreground",
    ring: "ring-primary",
    eyebrow: "ตู้เสื้อผ้าดิจิทัล + AI สไตลิสต์",
    headline: ["แมตช์ลุคที่ใช่", "จากตู้เสื้อผ้าที่คุณมี"] as const,
    signinTitle: "ยินดีต้อนรับกลับมา ✨",
    signupTitle: "มาเริ่มจัดตู้กันเลย 👗",
    signinSub: "เข้าสู่ระบบเพื่อกลับไปที่ตู้เสื้อผ้าของคุณ",
    signupSub: "สร้างบัญชีผู้ใช้ใหม่ ใช้อีเมลและตั้งรหัส PIN 6 หลัก",
    signinCta: "เข้าสู่ระบบ",
    signupCta: "สร้างบัญชีผู้ใช้",
    perks: [
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
      {
        icon: CalendarHeart,
        tone: "bg-sky text-sky-foreground",
        text: "บันทึกว่าวันไหนใส่ชุดอะไร",
      },
    ],
  },
  store: {
    accent: "bg-sky-foreground text-white shadow-sky-foreground/25",
    chip: "bg-sky text-sky-foreground",
    ring: "ring-sky-foreground",
    eyebrow: "สำหรับร้านค้า",
    headline: ["เปิดร้านบน", "MATCHME"] as const,
    signinTitle: "เข้าสู่ระบบร้านค้า 🏪",
    signupTitle: "เปิดร้านค้าใหม่ 🏪",
    signinSub: "เข้าสู่ระบบเพื่อจัดการร้านและไอเท็มของคุณ",
    signupSub: "สร้างบัญชีร้านค้าใหม่ — ต้องใช้อีเมลคนละอันกับบัญชีผู้ใช้",
    signinCta: "เข้าสู่ระบบร้านค้า",
    signupCta: "สร้างบัญชีร้านค้า",
    perks: [
      { icon: Store, tone: "bg-sky text-sky-foreground", text: "ร้านของคุณแสดงในหน้าช้อปปิ้ง" },
      {
        icon: PackageOpen,
        tone: "bg-lilac text-lilac-foreground",
        text: "จัดการไอเท็มในร้านได้เอง",
      },
      {
        icon: MapPin,
        tone: "bg-blush text-blush-foreground",
        text: "ลูกค้าเห็นแผนที่และช่องทางติดต่อ",
      },
    ],
  },
} as const;

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
  // AuthGate renders regardless of pathname, so this is what tells a visitor
  // arriving at /store/register that they're opening a SHOP, not a wardrobe.
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const audience = pathname.replace(/\/+$/, "") === "/store/register" ? "store" : "customer";
  const A = AUDIENCES[audience];
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
                <p className="text-sm text-muted-foreground mt-1">{A.eyebrow}</p>
              </div>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              {A.headline[0]}
              <br />
              <span className={audience === "store" ? "text-sky-foreground" : "text-primary"}>
                {A.headline[1]}
              </span>
            </h1>

            <div className="flex flex-col gap-2.5">
              {A.perks.map(({ icon: Icon, tone, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className={`size-9 rounded-xl ${tone} flex items-center justify-center`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium text-foreground/80">{text}</span>
                </div>
              ))}
            </div>

            {audience === "store" ? (
              <div className="self-center mt-2 size-40 rounded-[2rem] bg-sky/40 flex items-center justify-center shadow-inner">
                <Store className="size-16 text-sky-foreground" />
              </div>
            ) : (
              <img
                src="/images/15_MATCHME.png"
                alt="ตัวอย่างหน้าจอแอป MATCHME"
                className="w-64 self-center drop-shadow-2xl -mt-2"
              />
            )}
          </div>
        )}

        {/* ── Auth card ── */}
        <div className="glass w-full max-w-md mx-auto rounded-3xl border border-white/60 shadow-xl shadow-lilac/20 p-6 flex flex-col gap-5">
          {/* Brand — mobile only, desktop has the showcase panel */}
          <div className="flex flex-col items-center gap-2 lg:hidden">
            {audience === "store" ? (
              <span className="size-16 rounded-2xl bg-sky flex items-center justify-center shadow-lg shadow-sky-foreground/30">
                <Store className="size-8 text-sky-foreground" />
              </span>
            ) : (
              <img
                src="/images/MATCHME.png"
                alt=""
                className="size-16 rounded-2xl shadow-lg shadow-lilac/40"
              />
            )}
            <p className="text-lg font-bold tracking-tight">MATCHME</p>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${A.chip}`}>
              {audience === "store" ? "ร้านค้า" : "ผู้ใช้ทั่วไป"}
            </span>
          </div>

          {/* Mode as a segmented control, not a text link: the old toggle meant
              the CURRENT mode had to be inferred from the button label, which is
              why signing in and signing up looked identical. */}
          <div className="flex bg-muted/70 rounded-full p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition ${
                  mode === m ? `${A.chip} shadow-sm` : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "เข้าสู่ระบบ" : "สมัครใหม่"}
              </button>
            ))}
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {mode === "signin" ? A.signinTitle : A.signupTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "signin" ? A.signinSub : A.signupSub}
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
              className={`${A.accent} rounded-full py-3 text-sm font-semibold shadow-lg hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none transition mt-2`}
            >
              {submitting ? "กำลังดำเนินการ…" : mode === "signin" ? A.signinCta : A.signupCta}
            </button>

            {/* Guest mode — customer side only; a shop has nothing to demo
                read-only. Signs into the shared demo account seeded by
                scripts/seed-guest.ts; migration 029 is what makes it
                read-only, not this button. */}
            {audience === "customer" && (
              <button
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await signIn(GUEST_EMAIL, GUEST_PIN);
                    toast.success("กำลังดูแบบผู้เยี่ยมชม");
                  } catch {
                    toast.error("โหมดผู้เยี่ยมชมยังไม่พร้อมใช้งาน");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
                className="w-full rounded-full py-2.5 text-xs font-semibold bg-white/70 border border-border/50 text-foreground/75 hover:bg-white transition disabled:opacity-40"
              >
                ลองใช้แบบผู้เยี่ยมชม (ดูอย่างเดียว)
              </button>
            )}

            {/* Switches AUDIENCE, not mode. AuthGate renders regardless of
                pathname, so this only changes the URL; the store register form
                itself appears once the visitor signs in. */}
            <Link
              to={audience === "store" ? "/" : "/store/register"}
              className="text-center text-[11px] text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-2 transition"
            >
              {audience === "store" ? "เข้าใช้งานในฐานะผู้ใช้ทั่วไป" : "เปิดร้านค้า?"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
