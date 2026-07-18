import { useEffect, useState } from "react";
import { isProfileComplete, useProfile } from "@/hooks/use-profile";
import type { Gender, Profile } from "@/hooks/use-profile";

export function ProfileGate() {
  const { profile, update } = useProfile();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  if (!mounted) return null;
  if (isProfileComplete(profile)) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-3xl w-full max-w-md p-5 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">ตั้งค่าโปรไฟล์ก่อนเริ่มใช้งาน</h2>
          <p className="text-xs text-muted-foreground mt-1">
            กรอกข้อมูลเบื้องต้นเพื่อเริ่มใช้งานตู้เสื้อผ้าของคุณ
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">ชื่อ</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="ชื่อที่คุณอยากให้แสดง"
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">วันเกิด</span>
            <input
              type="date"
              max={today}
              value={draft.birthdate}
              onChange={(e) => setDraft({ ...draft, birthdate: e.target.value })}
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">เพศ</span>
            <select
              value={draft.gender}
              onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender })}
              className="bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-primary"
            >
              <option value="">ไม่ระบุ</option>
              <option value="female">หญิง</option>
              <option value="male">ชาย</option>
              <option value="other">อื่น ๆ</option>
            </select>
          </label>

          <button
            onClick={() =>
              update({ name: draft.name.trim(), birthdate: draft.birthdate, gender: draft.gender })
            }
            disabled={!isProfileComplete(draft)}
            className="bg-primary text-primary-foreground rounded-full py-3 text-sm font-medium disabled:opacity-40 mt-2"
          >
            เริ่มใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
}
