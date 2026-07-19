import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, Share2 } from "lucide-react";
import { BodyScanCamera } from "@/components/BodyScanCamera";
import { useBodyModel } from "@/hooks/use-body-model";
import { useProfile } from "@/hooks/use-profile";
import { tryOnOutfit } from "@/lib/try-on.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/virtual-model")({
  component: VirtualModelPage,
  head: () => ({
    meta: [{ title: "Virtual Model · Digital Wardrobe" }],
  }),
});

type Step = "measure" | "scan" | "processing" | "result";

const DEFAULT_LABEL = "ชุดเริ่มต้น";

const PROGRESS: Record<Step, string> = {
  measure: "33%",
  scan: "66%",
  processing: "100%",
  result: "100%",
};

function VirtualModelPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { bodyModel, generate } = useBodyModel();
  const tryOn = useServerFn(tryOnOutfit);

  const [step, setStep] = useState<Step>(bodyModel ? "result" : "measure");
  const [heightCm, setHeightCm] = useState(profile.heightCm || "");
  const [weightKg, setWeightKg] = useState(profile.weightKg || "");
  const [scanDataUrl, setScanDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(bodyModel?.avatarImageUrl ?? null);
  const [activeLabel, setActiveLabel] = useState(DEFAULT_LABEL);
  const [cameFromMatches] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tryOn"),
  );
  const generatingRef = useRef(false);
  const tryOnStartedRef = useRef(false);

  useEffect(() => {
    if (step !== "processing" || !scanDataUrl || generatingRef.current) return;
    generatingRef.current = true;
    setError(null);
    generate({
      scanImageDataUrl: scanDataUrl,
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      gender: profile.gender,
    })
      .then((model) => {
        setActiveImage(model.avatarImageUrl);
        setActiveLabel(DEFAULT_LABEL);
        setStep("result");
      })
      .catch(() => {
        setScanDataUrl(null);
        setStep("measure");
      })
      .finally(() => {
        generatingRef.current = false;
      });
  }, [step, scanDataUrl, heightCm, weightKg, profile.gender, generate]);

  useEffect(() => {
    if (typeof window === "undefined" || !bodyModel || tryOnStartedRef.current) return;
    const matchName = new URLSearchParams(window.location.search).get("tryOn");
    if (!matchName) return;
    tryOnStartedRef.current = true;
    setStep("processing");
    tryOn({ data: { matchName } })
      .then((r) => {
        setActiveImage(r.imageUrl);
        setActiveLabel(matchName);
        setStep("result");
      })
      .catch((e) => {
        toast.error(`ลองชุดไม่สำเร็จ: ${(e as Error).message}`);
        setActiveImage(bodyModel.avatarImageUrl);
        setActiveLabel(DEFAULT_LABEL);
        setStep("result");
      });
  }, [bodyModel, tryOn]);

  function goBack() {
    navigate({ to: cameFromMatches ? "/matches" : "/profile" });
  }

  if (step === "scan") {
    return (
      <BodyScanCamera
        onCapture={(dataUrl) => {
          setScanDataUrl(dataUrl);
          setStep("processing");
        }}
        onCancel={() => setStep("measure")}
      />
    );
  }

  const soon = () => toast.info("ฟีเจอร์นี้กำลังจะมาเร็ว ๆ นี้");

  function restartWizard() {
    setActiveImage(null);
    setScanDataUrl(null);
    setStep("measure");
  }

  function backToDefaultOutfit() {
    if (!bodyModel) return;
    setActiveImage(bodyModel.avatarImageUrl);
    setActiveLabel(DEFAULT_LABEL);
  }

  if (step === "result" && activeImage) {
    return (
      <div className="fixed inset-0 z-40 bg-black flex items-center justify-center sm:p-6">
        <div className="relative w-full h-full bg-neutral-400 sm:max-w-md sm:h-auto sm:aspect-[9/19.5] sm:max-h-[90dvh] sm:rounded-[2.5rem] sm:overflow-hidden sm:ring-1 sm:ring-white/10 sm:shadow-2xl">
          <img
            src={activeImage}
            alt="Virtual model"
            className="absolute inset-x-0 top-0 w-full h-[calc(100%-11rem)] object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

          <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4">
            <button
              onClick={goBack}
              className="size-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center"
              aria-label="กลับ"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="px-4 py-2 rounded-full bg-white/90 text-xs font-bold tracking-wide">
              AI VIRTUAL MODEL V1.0
            </span>
            <button
              onClick={soon}
              className="size-9 rounded-full bg-white/90 shadow-sm flex items-center justify-center"
              aria-label="แชร์"
            >
              <Share2 className="size-4" />
            </button>
          </div>

          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">ชุดปัจจุบัน</p>
                <p className="text-sm font-bold truncate">{activeLabel}</p>
              </div>
              <button
                onClick={restartWizard}
                className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0"
                aria-label="สร้างโมเดลใหม่"
              >
                <RefreshCw className="size-4" />
              </button>
              <button
                onClick={soon}
                className="shrink-0 px-5 py-3 rounded-full bg-foreground text-background text-sm font-semibold"
              >
                ลองชุดอื่น
              </button>
            </div>
            {activeLabel !== DEFAULT_LABEL && (
              <button
                onClick={backToDefaultOutfit}
                className="w-full py-2.5 rounded-full bg-muted text-sm font-semibold"
              >
                กลับไปชุดเริ่มต้น
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFD] flex flex-col">
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: PROGRESS[step] }}
        />
      </div>

      <div className="flex items-center gap-2 px-5 pt-5">
        <button
          onClick={goBack}
          className="size-9 rounded-full bg-white shadow-sm border border-border/40 flex items-center justify-center"
          aria-label="กลับ"
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
        {step === "measure" && (
          <>
            <div>
              <h1 className="text-xl font-bold">ยืนยันรูปร่างของคุณ</h1>
              <p className="text-sm text-muted-foreground mt-1">
                โปรดระบุส่วนสูงและน้ำหนักที่แน่นอน
              </p>
            </div>
            <div className="w-full max-w-xs flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-left">
                <span className="text-xs text-muted-foreground">ส่วนสูง (ซม.)</span>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="bg-muted rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary"
                  placeholder="เช่น 165"
                />
              </label>
              <label className="flex flex-col gap-1 text-left">
                <span className="text-xs text-muted-foreground">น้ำหนัก (กก.)</span>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="bg-muted rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary"
                  placeholder="เช่น 55"
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              ข้อมูลนี้จะนำไปคำนวณสัดส่วนโมเดล 3D ให้สมจริงที่สุด
            </p>
            <button
              onClick={() => {
                const h = Number(heightCm);
                const w = Number(weightKg);
                if (!h || h <= 0 || !w || w <= 0) {
                  setError("กรุณากรอกส่วนสูงและน้ำหนักให้ถูกต้อง");
                  return;
                }
                setError(null);
                setStep("scan");
              }}
              className="w-full max-w-xs bg-primary text-primary-foreground rounded-full py-3.5 text-sm font-semibold"
            >
              ถัดไป
            </button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </>
        )}

        {step === "processing" && (
          <>
            <div className="size-24 rounded-full border-4 border-lilac border-t-transparent animate-spin flex items-center justify-center">
              <Loader2 className="size-8 text-lilac-foreground animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-bold">กำลังประมวลผล</h1>
              <p className="text-sm text-muted-foreground mt-1">MATCHME AI กำลังปั้นโมเดลให้คุณ</p>
            </div>
            <p className="text-sm font-medium">AI กำลังสร้างโมเดลของคุณ...</p>
            <p className="text-xs text-muted-foreground">อาจใช้เวลาประมาณ 10-20 วินาที</p>
          </>
        )}
      </div>
    </div>
  );
}
