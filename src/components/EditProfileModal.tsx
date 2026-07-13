import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Check, Trash2, X } from "lucide-react";
import type { Gender, Profile } from "@/hooks/use-profile";

interface Props {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onSave: (patch: Partial<Profile>) => void;
}

const AVATAR_MAX_DIM = 256;

async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const target = Math.min(AVATAR_MAX_DIM, side);
  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function EditProfileModal({ open, profile, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Profile>(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setDraft(profile);
  }, [open, profile]);

  if (!open) return null;

  const handleSave = () => {
    if (!draft.name.trim()) {
      toast.error("กรุณาตั้งชื่อ");
      return;
    }
    onSave({
      name: draft.name.trim(),
      handle: draft.handle.trim(),
      email: draft.email.trim(),
      bio: draft.bio.trim(),
      favoriteStyle: draft.favoriteStyle.trim(),
      avatarUrl: draft.avatarUrl,
      gender: draft.gender,
      heightCm: draft.heightCm.trim(),
      weightKg: draft.weightKg.trim(),
    });
    toast.success("บันทึกโปรไฟล์แล้ว");
    onClose();
  };

  async function onPickAvatar(file: File) {
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setDraft((d) => ({ ...d, avatarUrl: dataUrl }));
    } catch (e) {
      toast.error(`อ่านรูปไม่สำเร็จ: ${(e as Error).message}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">แก้ไขโปรไฟล์</h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="size-24 rounded-full overflow-hidden bg-lilac text-lilac-foreground flex items-center justify-center text-3xl font-bold shadow-sm">
              {draft.avatarUrl ? (
                <img src={draft.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                (draft.name[0] ?? "?")
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:opacity-90 transition"
              aria-label="เปลี่ยนรูปโปรไฟล์"
            >
              <Camera className="size-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-border transition font-semibold"
            >
              เปลี่ยนรูป
            </button>
            {draft.avatarUrl && (
              <button
                onClick={() => setDraft((d) => ({ ...d, avatarUrl: "" }))}
                className="text-xs px-3 py-1.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition font-semibold flex items-center gap-1"
              >
                <Trash2 className="size-3" /> ลบรูป
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickAvatar(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Field
            label="ชื่อ"
            value={draft.name}
            onChange={(v) => setDraft({ ...draft, name: v })}
            placeholder="ชื่อที่คุณอยากให้แสดง"
          />
          <Field
            label="แฮนเดิล"
            value={draft.handle}
            onChange={(v) => setDraft({ ...draft, handle: v })}
            placeholder="@username"
          />
          <Field
            label="อีเมล"
            value={draft.email}
            onChange={(v) => setDraft({ ...draft, email: v })}
            placeholder="you@example.com"
          />
          <TextArea
            label="ไบโอ"
            value={draft.bio}
            onChange={(v) => setDraft({ ...draft, bio: v })}
            placeholder="บอกเล่าสไตล์ของคุณ"
          />
          <Field
            label="สไตล์โปรด"
            value={draft.favoriteStyle}
            onChange={(v) => setDraft({ ...draft, favoriteStyle: v })}
            placeholder="เช่น Minimal · Pastel"
          />

          <p className="text-xs font-semibold text-muted-foreground mt-1">ข้อมูลพื้นฐาน</p>
          <Select
            label="เพศ"
            value={draft.gender}
            onChange={(v) => setDraft({ ...draft, gender: v as Gender })}
            options={[
              { value: "", label: "ไม่ระบุ" },
              { value: "female", label: "หญิง" },
              { value: "male", label: "ชาย" },
              { value: "other", label: "อื่น ๆ" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="ส่วนสูง (ซม.)"
              value={draft.heightCm}
              onChange={(v) => setDraft({ ...draft, heightCm: v })}
              placeholder="เช่น 165"
              type="number"
            />
            <Field
              label="น้ำหนัก (กก.)"
              value={draft.weightKg}
              onChange={(v) => setDraft({ ...draft, weightKg: v })}
              placeholder="เช่น 55"
              type="number"
            />
          </div>

          <button
            onClick={handleSave}
            className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 mt-2"
          >
            <Check className="size-4" /> บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary resize-none"
      />
    </label>
  );
}
