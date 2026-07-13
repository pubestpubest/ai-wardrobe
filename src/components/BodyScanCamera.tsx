import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";

const MAX_DIM = 1024;

async function fileToScanDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function BodyScanCamera({
  onCapture,
  onCancel,
}: {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      })
      .catch(() => setCameraError(true));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_DIM / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);
    stopStream();
    onCapture(canvas.toDataURL("image/jpeg", 0.85));
  }

  async function onPickFile(file: File) {
    const dataUrl = await fileToScanDataUrl(file);
    stopStream();
    onCapture(dataUrl);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center sm:p-6">
      <div className="w-full h-full flex flex-col sm:max-w-md sm:aspect-[9/19.5] sm:max-h-[90vh] sm:rounded-[2.5rem] sm:overflow-hidden sm:ring-1 sm:ring-white/10 sm:shadow-2xl sm:bg-black">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              stopStream();
              onCancel();
            }}
            className="size-9 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="ปิด"
          >
            <X className="size-4" />
          </button>
          <p className="text-white text-sm font-semibold">สแกนตัวจริงของคุณ</p>
          <div className="size-9" />
        </div>

        <p className="text-center text-white/70 text-xs px-6 -mt-2 mb-2">
          ถ่ายรูปตัวเต็มให้เห็นตั้งแต่หัวจรดเท้า
        </p>

        <div className="relative flex-1 overflow-hidden">
          {!cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          {cameraError && (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-sm px-8 text-center">
              ไม่สามารถเข้าถึงกล้องได้ กรุณาอัปโหลดรูปแทน
            </div>
          )}

          {cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[58%] max-w-[280px] aspect-[2/5] rounded-[999px] border-2 border-dashed border-white/60" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 p-6">
          {!cameraError && (
            <button
              onClick={capture}
              disabled={!cameraReady}
              className="w-full max-w-xs bg-lilac text-lilac-foreground rounded-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition"
            >
              <Camera className="size-4" /> ถ่ายรูป Scan ตัวเอง
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-white/70 flex items-center gap-1.5 hover:text-white transition"
          >
            <ImageUp className="size-3.5" /> อัปโหลดรูปจากคลังภาพแทน
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
