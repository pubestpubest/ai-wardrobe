# PRD — Digital Wardrobe with AI Stylist

**Version:** 1.2
**Date:** 2026-08-06 (§11–§13 refreshed; §1–§10 are the original proposal, kept as the baseline §11 measures against)
**Owner:** pubestpubest@gmail.com
**Status:** Draft

---

## 1. Overview

### 1.1 Product Summary

Digital Wardrobe เป็นแอปมือถือที่ให้ผู้ใช้สร้างตู้เสื้อผ้าดิจิทัลของตัวเอง โดยอัปโหลดรูปเสื้อผ้าที่มีอยู่ในชีวิตจริง แล้วใช้ AI Stylist ช่วย **จับคู่ชุด** ตามโอกาส, สภาพอากาศ, สไตล์ส่วนตัว และเทรนด์แฟชั่น พร้อมระบบ AI ที่ช่วย **กรอกหมวดหมู่ สี และสไตล์อัตโนมัติ** เมื่ออัปโหลดรูปใหม่

### 1.2 Problem Statement

- ผู้ใช้มีเสื้อผ้าจำนวนมากแต่จำไม่ได้ว่ามีอะไรบ้าง ทำให้ซื้อซ้ำ
- การจับคู่ชุดให้เหมาะกับโอกาสต้องอาศัยความรู้ด้านแฟชั่น
- กรอกข้อมูลเสื้อผ้าทีละชิ้นใช้เวลานานเกินไป
- ไม่รู้ว่ามีเสื้อผ้าชิ้นไหนขาดในตู้บ้าง

### 1.3 Goals

1. ลดเวลาในการตัดสินใจเลือกชุดเหลือ < 30 วินาที
2. ผู้ใช้สามารถเพิ่มเสื้อผ้า 1 ชิ้นเสร็จภายใน 10 วินาที (ด้วย AI auto-fill)
3. AI แนะนำชุดที่ผู้ใช้ "ชอบ" หรือ "ใส่จริง" > 70%
4. รักษาผู้ใช้กลับมาใช้ซ้ำในสัปดาห์แรก > 40%

### 1.4 Non-Goals (v1)

- ฟังก์ชัน Social / แชร์ชุดให้คนอื่น
- E-commerce integration (ซื้อขายในแอป)
- AR ลองเสื้อ
- รองรับเสื้อผ้าหลายผู้ใช้ในตู้เดียวกัน (family closet)

---

## 2. Target Users & Personas

| Persona                       | Description                                  | Pain Point                      |
| ----------------------------- | -------------------------------------------- | ------------------------------- |
| **มินิ – Office Worker (28)** | ทำงานออฟฟิศ ต้องแต่งตัวให้ดูดี 5 วัน/สัปดาห์ | คิดชุดไม่ออกทุกเช้า             |
| **เจน – Student (20)**        | นักศึกษามหา'ลัย ชอบแฟชั่น                    | ตู้รก จำไม่ได้ว่ามีอะไร         |
| **โอม – Casual Dresser (32)** | ผู้ชายที่อยากแต่งตัวให้ดูดีแต่ไม่มีเวลา      | ไม่รู้ว่าเสื้อผ้าชิ้นไหนเข้ากัน |

---

## 3. Core Features

### 3.1 Feature: AI Stylist (P0)

**Description:** AI ที่ช่วยแนะนำชุดจากเสื้อผ้าที่ผู้ใช้มีอยู่

**User Flow:**

1. ผู้ใช้เปิดหน้า "AI Stylist"
2. ระบบดึงข้อมูลโอกาส/สภาพอากาศอัตโนมัติ (location + calendar) หรือให้ผู้ใช้เลือกเอง
3. **หากข้อมูลไม่พอ AI จะถามคำถามเพิ่มเติมก่อน เช่น:**
   - "วันนี้คุณจะไปไหน?" (ทำงาน / เที่ยว / ออกเดท / งานทางการ)
   - "อุณหภูมิวันนี้ ~30°C ต้องการชุดเบา ๆ ใช่ไหม?"
   - "สไตล์ที่ต้องการวันนี้ — สุภาพ / ลำลอง / มินิมอล / สตรีท?"
4. AI วิเคราะห์ตู้เสื้อผ้า → แนะนำ 3 ชุด พร้อมเหตุผล
5. ถ้าตู้ไม่มีไอเท็มที่เข้ากัน → แนะนำ "สิ่งที่ควรซื้อเพิ่ม"
6. ผู้ใช้กด ❤️ (ชอบ) / 👎 (ไม่ชอบ) เพื่อสอนระบบ

**Acceptance Criteria:**

- ระบบไม่แนะนำชุดที่ไม่เหมาะกับบริบท (เช่น ชุดสั้น + งานทางการ)
- แสดงเหตุผลการเลือกชุด ≤ 2 ประโยค
- รองรับการ regenerate ชุดใหม่ ≥ 5 ครั้ง/วัน

---

### 3.2 Feature: AI Photo Upload & Auto-tag (P0)

**Description:** อัปโหลดรูปเสื้อผ้า → AI กรอก หมวดหมู่, สี, สไตล์ ให้อัตโนมัติ

**User Flow:**

1. กดปุ่ม ➕ → เลือก "ถ่ายรูป" หรือ "เลือกจากแกลเลอรี"
2. ลบพื้นหลัง (background removal) — **✅ ทำแล้ว (B09)**: ปุ่ม "ลบพื้นหลัง" แบบ opt-in ใน UploadItem ใช้ `@imgly/background-removal` ทำงานบน browser (client-side, ฟรี) + preview ให้ผู้ใช้เลือกเก็บ cutout หรือรูปเดิม
3. AI วิเคราะห์ → กรอกฟิลด์เบื้องต้น:
   - **หมวดหมู่** (เสื้อยืด / กางเกงยีนส์ / เดรส / รองเท้า ฯลฯ)
   - **สี** (สีหลัก + สีรอง พร้อม hex code)
   - **สไตล์** (Casual / Formal / Streetwear / Minimal / Sport)
   - **ฤดู** (ร้อน / ฝน / หนาว / ทุกฤดู)
4. ผู้ใช้ตรวจสอบ + แก้ไขได้ → กด "บันทึก"

**Acceptance Criteria:**

- เวลาประมวลผล < 5 วินาที/รูป
- ความแม่นยำหมวดหมู่ ≥ 85%
- ความแม่นยำสีหลัก ≥ 90%
- รองรับการแก้ไขทุกฟิลด์ก่อนบันทึก

---

### 3.3 Feature: Wardrobe Management (P0)

**Description:** จัดการตู้เสื้อผ้า — ดู, แก้ไข, ลบ, จัดหมวด

**Sub-features:**

- กรองตามหมวดหมู่ / สี / สไตล์
- ค้นหา (search bar) — ค้นจากหมวดหมู่/สี/สไตล์ และ tag โอกาสการใช้งาน (predefined, ดู 3.6 Item Tags)
- สถิติ: เสื้อผ้าทั้งหมด, ใช้บ่อยที่สุด, ไม่ได้ใส่นานสุด
- Mark as "donated" / "to-sell"

---

### 3.4 Feature: Outfit History & Calendar (P1)

**Description:** บันทึกชุดที่ใส่แต่ละวัน + ปฏิทินย้อนหลัง

- กด "ใส่วันนี้" จากชุดที่ AI แนะนำ
- ดูชุดที่เคยใส่ในวันที่ผ่านมา
- **Calendar view รายเดือน** — เห็นชุดที่ใส่แต่ละวันแบบปฏิทิน — **✅ ทำแล้ว (B05)**: `outfit_wears` + `OutfitCalendar` (toggle ในหน้า Matches) พร้อม**รูปตัวอย่างชุดในช่องวันที่ + hover/tap ดูรายละเอียดเต็ม**
- ป้องกันใส่ชุดซ้ำในระยะเวลาใกล้กัน — **หนึ่งวัน = หนึ่งชุด ✅** (unique `(user_id, worn_date)`, migration `017`) ส่วนการเตือนว่าใส่ซ้ำในรอบ N วัน ยัง defer

---

### 3.5 Feature: In-App Weather Status (P1)

> **อัปเดต 2026-07-18:** เดิมเป็น "Smart Notifications" (push notification) — ตัดออกจากสโคป ตัดสินใจแสดงสภาพอากาศเป็นสถานะภายในแอปแทน ไม่ต้องมี push/notification permission หรือ background job

**Description:** แสดงสภาพอากาศปัจจุบันของ location ผู้ใช้เป็นการ์ดสถานะในหน้า Home (เช่น "วันนี้ฝนตก แนะนำเสื้อแขนยาว") เพื่อประกอบการตัดสินใจเลือกชุด

**Acceptance Criteria:**

- ดึงสภาพอากาศตาม location ปัจจุบัน แสดงผลในหน้า Home
- ไม่ต้องขอ notification permission ใด ๆ

---

### 3.6 Feature: Item Tags (P1)

**Description:** เพิ่ม tag แบบ **ชุดที่กำหนดไว้ล่วงหน้า (predefined)** ต่อไอเท็ม — เป็นแท็ก "โอกาสการใช้งาน" (ทำงาน / ลำลอง / ออกเดท / งานทางการ / เที่ยว / ออกกำลังกาย) เพิ่มมิติที่ orthogonal กับหมวดหมู่/สี/สไตล์ (จงใจไม่ทำเป็น free-form เพื่อเลี่ยงการซ้ำซ้อนกับฟิลด์ `style` ที่เป็น free-form อยู่แล้ว — ตัดสินใจในขั้นตอน grill ของ loop B01) เพื่อรองรับการค้นหาที่ยืดหยุ่นขึ้น

**User Flow:**

1. เลือก/ยกเลิก tag (multi-select chips) ได้จากหน้า Add Item หรือ Edit Item
2. Tag ใช้ค้นหาในหน้า Wardrobe (3.3)

**Acceptance Criteria:**

- เลือก/ยกเลิก tag จากชุดที่กำหนดไว้ได้หลายอันต่อไอเท็ม
- ค้นหาไอเท็มจาก tag ได้ในหน้า Wardrobe

---

### 3.7 Feature: Affiliate Shopping — UI Polish (P1)

**Description:** ปรับปรุง UI หน้า "ช้อปปิ้ง" (Discover — สร้างเพิ่มนอกแผนเดิม ดู 11.3) ให้ใช้งานง่ายขึ้น

> **หมายเหตุ:** ฟีเจอร์นี้แหย่เข้าใกล้ Non-Goal "E-commerce integration" (1.4) — ทีมรับทราบแล้วและตัดสินใจเดินหน้าปรับ UI ต่อ

**Sub-features:**

- กรองตามหมวดหมู่ (categories)
- กรองตามร้านค้า (store)
- ค้นหา (search bar)

---

### 3.8 Feature: Authentication (P1)

> **✅ ทำแล้ว (B07a–d)** — ย่อหน้าด้านล่างเขียนไว้ตอนยังเป็น guest mode จึงบรรยายสภาพ "ก่อนทำ" เก็บไว้เป็น baseline; สถานะจริงดู §11.2 และ §12 (ค้างเฉพาะ AUTH-1 ใน §13)

**Description:** เพิ่มระบบสมัคร/เข้าสู่ระบบจริง (Supabase Auth, email + 6-digit PIN — PIN ใช้เป็น password ของ Supabase) แทน guest mode ปัจจุบัน — ปัจจุบันข้อมูลทุกอย่างเป็น **global pool** ใช้ service-role bypass RLS (ดู 11.x) โดยผูก `requireSupabaseAuth` middleware + client token-attacher ที่มีอยู่แล้ว (ตอนนี้เป็น dead code) เข้ากับ server functions จริง และเปลี่ยนไปใช้ user-scoped client + RLS `auth.uid() = user_id` — แตกงานเป็น B07a–d (ดู §12)

**Acceptance Criteria:**

- Sign up / log in / log out (email + 6-digit PIN)
- server functions ของข้อมูลผู้ใช้ (items/matches/body-model/profile) ใช้ user-scoped client + RLS ผูกกับ `user_id` (ย้อน RLS แบบเปิดใน migration 003)
- ข้อมูล global pool เดิม (ไม่มี owner attribution เพราะ `session_id` ถูก drop ใน 004) → **claim-all เข้า seed account** (บัญชีแรกที่สมัคร) — ไม่ใช่ migrate แบบ per-guest (เป็นไปไม่ได้)
- profile ย้ายจาก localStorage → ตาราง `profiles` ต่อบัญชี; logout เคลียร์ `wardrobe.chat` / `wardrobe.profile` ใน localStorage

---

### 3.9 Feature: Profile — Identity & Body Measurements (P0/P1)

**Required fields:**

- ชื่อ (name)
- วันเกิด (birthdate)
- เพศ (gender)

**Optional fields:**

- สัดส่วนร่างกาย (body measurements) — เตรียมไว้สำหรับ Virtual Try-On (3.10) ไม่บังคับกรอกตอนนี้

**Acceptance Criteria:**

- บังคับกรอก name/birthdate/gender ก่อนใช้งานฟีเจอร์หลัก (flow — onboarding vs. gate ทีหลัง ต้องตกลงกับทีม)
- ฟิลด์ body measurement เป็น optional แก้ไขทีหลังได้

---

### 3.10 Feature: Virtual Try-On (P2 — Deferred, Last)

**Description:** ลองชุดผ่านอวตารจากรูปร่างที่สแกน — มีอยู่แล้วบางส่วน (ดู 11.3 "Virtual Try-On / Body Model") ปัจจุบันเป็น **mock** (รูปสำเร็จรูป ไม่ generate จริง เพราะติด quota image-gen model)

> **หมายเหตุ 2026-07-18:** จัดเป็นงานลำดับสุดท้ายเพราะยากที่สุด (ต้องแก้ quota/เปลี่ยน image-gen model ก่อนถึงจะ generate จริงได้) — ดู Section 12 สำหรับลำดับความสำคัญรวม

---

## 4. UI / UX Design

### 4.1 Visual Style

แรงบันดาลใจจาก reference (health app card-based UI):

- **Card-based layout** — แต่ละการ์ดมี border-radius ~24px
- **Soft shadow** + พื้นหลังขาวสะอาด
- **Iconography** กลม นุ่มนวล
- **Typography** sans-serif, bold heading

### 4.2 Color Palette

| Token              | Hex       | Usage                                       |
| ------------------ | --------- | ------------------------------------------- |
| `--primary-purple` | `#d2ccfc` | Hero cards, primary CTA, AI Stylist section |
| `--primary-pink`   | `#fccce2` | Wardrobe section, "ใส่วันนี้" CTA           |
| `--primary-blue`   | `#cce2fc` | Weather/context cards, secondary actions    |
| `--neutral-bg`     | `#FAFAFA` | App background                              |
| `--text-primary`   | `#1A1A1A` | Main text                                   |
| `--text-secondary` | `#6B6B6B` | Captions                                    |

### 4.3 Screen Map

1. **Home** — Hero card (AI Suggestion วันนี้) + การ์ดย่อย (Wardrobe, History, Stats)
2. **AI Stylist** — Chat-like interface + Outfit cards
3. **Wardrobe** — Grid view + filter chips
4. **Add Item** — Camera/upload + AI auto-fill form
5. **Item Detail** — รูป + tag + จำนวนครั้งที่ใส่
6. **Profile** — Style preference, settings

### 4.4 Navigation

Bottom tab bar (5 ปุ่ม): Home / Wardrobe / **Add (กลาง, เด่น)** / Stylist / Profile

---

## 5. Technical Requirements

### 5.1 Stack (Proposed)

- **Mobile:** React Native / Flutter
- **Backend:** Node.js / Go + REST API
- **Database:** PostgreSQL (metadata) + S3 (images)
- **AI Services:**
  - Image tagging: Claude Vision API หรือ custom CV model
  - Background removal: remove.bg API หรือ U²-Net
  - Outfit recommendation: Claude API (claude-opus-4-7) — รับ wardrobe JSON + context → ตอบเป็น outfit suggestion

### 5.2 Key APIs

| Endpoint            | Method       | Description                          |
| ------------------- | ------------ | ------------------------------------ |
| `/items`            | POST         | อัปโหลดรูป + รับ AI tags             |
| `/items`            | GET          | ดึงรายการเสื้อผ้า                    |
| `/items/:id`        | PUT / DELETE | แก้ไข / ลบ                           |
| `/stylist/suggest`  | POST         | รับ context → คืน outfit suggestions |
| `/stylist/feedback` | POST         | บันทึก like/dislike                  |
| `/outfits/history`  | GET          | ดู outfit ย้อนหลัง                   |

### 5.3 Data Model (สรุป)

```
User { id, name, style_preference, location }
Item { id, user_id, image_url, category, colors[], style, season, wear_count, last_worn }
Outfit { id, user_id, item_ids[], occasion, weather, worn_date, feedback }
```

---

## 6. AI Prompt Spec — Stylist

**System Prompt:**

> คุณคือ AI Stylist สำหรับแอป Digital Wardrobe
> หน้าที่ของคุณคือช่วยผู้ใช้เลือกและจับคู่เสื้อผ้าจากตู้เสื้อผ้าดิจิทัลของผู้ใช้
> โดยพิจารณาจากสไตล์ส่วนตัว โอกาสในการใช้งาน สี รูปทรง เทรนด์แฟชั่น สภาพอากาศ และความต้องการของผู้ใช้
>
> ข้อกำหนด:
>
> 1. แนะนำชุดจากเสื้อผ้าที่ผู้ใช้มีอยู่ก่อน
> 2. หากไม่มีไอเท็มที่เหมาะสม ให้แนะนำไอเท็มที่ควรซื้อเพิ่ม
> 3. อธิบายเหตุผลในการเลือกชุดอย่างกระชับ (≤ 2 ประโยค)
> 4. หลีกเลี่ยงคำแนะนำที่ไม่เหมาะกับบริบท (เช่น ชุดไม่สุภาพกับงานทางการ)
> 5. ตอบกลับเป็นภาษาไทย
> 6. หากข้อมูลไม่เพียงพอ ให้ถามคำถามเพิ่มเติมก่อน (โอกาสในการใส่ / สภาพอากาศ / สไตล์ที่ต้องการ)

**Input (JSON):**

```json
{
  "wardrobe": [{ "id": "...", "category": "...", "color": "...", "style": "..." }],
  "context": { "occasion": "...", "weather": "...", "user_style": "..." }
}
```

**Output:** outfit suggestions (item_ids[], reason, missing_items[])

---

## 7. Success Metrics (KPIs)

| Metric                             | Target                  |
| ---------------------------------- | ----------------------- |
| Daily Active Users (DAU)           | +20% MoM                |
| Avg. items uploaded / user         | ≥ 20 ชิ้น ภายในเดือนแรก |
| AI suggestion acceptance rate (❤️) | ≥ 70%                   |
| Time to add new item               | < 10 วินาที             |
| Weekly retention (W1)              | ≥ 40%                   |
| Crash-free sessions                | ≥ 99.5%                 |

---

## 8. Milestones / Roadmap

### Iteration 1 — Foundation (Week 1–2)

1. DB schema: User, Item
2. Upload รูป + บันทึกใน S3 (ยังไม่ใช้ AI)
3. หน้าตู้เสื้อผ้าแบบ grid
4. Swagger doc
5. Manual test

### Iteration 2 — AI Auto-tag (Week 3)

1. Integrate Claude Vision API
2. Auto-fill form
3. Background removal
4. Manual test

### Iteration 3 — AI Stylist (Week 4–5)

1. DB: Outfit, Feedback
2. `/stylist/suggest` endpoint
3. หน้า AI Stylist + UI flow ถามคำถาม
4. Like/dislike feedback loop
5. Swagger + manual test

### Iteration 4 — UI Polish (Week 6)

1. Redesign ด้วย color palette ใหม่ (#d2ccfc / #fccce2 / #cce2fc)
2. Card-based layout ตาม reference
3. Bottom tab navigation
4. Manual test

### Iteration 5 — History & Notifications (Week 7+)

1. Outfit history calendar
2. Smart notifications (weather-based)

---

## 9. Open Questions

1. จะใช้ Claude Vision หรือ train custom model สำหรับ tagging?
2. รองรับ offline mode ไหม?
3. ขายแบบ Freemium (free 50 ชิ้น) หรือ Subscription เต็มรูปแบบ?
4. ต้องการ onboarding flow แบบ style quiz หรือไม่?
5. Background removal (3.2) — **ตัดสินใจแล้ว (2026-07-19, loop B09):** `@imgly/background-removal` client-side (ฟรี, on-device, AGPL) + preview-and-revert UX แทน remove.bg/U²-Net (grill: preview-and-reject ต้องฟรีต่อครั้ง → client-side ชนะ)

---

## 10. Risks

| Risk                                      | Impact | Mitigation                            |
| ----------------------------------------- | ------ | ------------------------------------- |
| AI tagging ไม่แม่นยำกับเสื้อผ้าไทย/เอเชีย | High   | เก็บ feedback ผู้ใช้ → fine-tune      |
| ต้นทุน AI API สูง                         | Medium | Cache + จำกัด regenerate/วัน          |
| ผู้ใช้ขี้เกียจอัปโหลดเสื้อผ้า             | High   | Bulk upload, gamification             |
| Privacy concerns (รูปเสื้อผ้าส่วนตัว)     | Medium | E2E encryption + clear privacy policy |

---

## 11. Implementation Status (as of 2026-08-06)

> สรุปสิ่งที่ Build ไปแล้วจริงในโค้ด เทียบกับแผนใน PRD นี้ — อ้างอิงจาก commit history และโค้ดปัจจุบันบน `main`

### 11.1 สร้างด้วย Stack จริง (ต่างจาก 5.1 ที่เสนอไว้)

แอปปัจจุบันเป็น **เว็บแอป (TanStack Start / React SSR)** ไม่ใช่ Mobile App ตามที่ระบุใน 5.1, ใช้ Supabase (Postgres + Storage + **Auth**) แทน custom REST API + S3, และใช้ **Gemini (`gemini-3.1-flash-lite`)** แทน Claude Vision/Claude API สำหรับทั้ง image tagging และ outfit suggestion — คีย์แยกต่อ environment (`AGENT_PLATFORM_API_KEY_DEV/UAT/PROD`, สลับผ่าน DevTools) โหมดผู้ใช้ปัจจุบันเป็น **บัญชีจริง** (Supabase email + 6-digit PIN, auth gate ใน `__root`, RLS `auth.uid()=user_id` ทุกตารางผู้ใช้) — guest/session mode เดิมถูกถอดออกแล้ว (`session_id` เพิ่มใน `003` แล้ว drop ใน `004`)

Deploy: Docker image (`Dockerfile` + `prod.ts` static-file server หน้า SSR handler) build/push อัตโนมัติผ่าน GitHub Actions → DockerHub → deploy webhook

### 11.2 Feature Status เทียบกับ Section 3

| Feature (PRD)                  | สถานะ               | รายละเอียด                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 AI Stylist                 | ✅ ทำแล้ว           | `matchChat` (`match-chat.functions.ts`) ส่ง wardrobe JSON + ประวัติแชทให้ Gemini แล้วตอบเป็นภาษาไทย ผ่านหน้า chat (`StylistChat.tsx`) รองรับ **พิมพ์ข้อความ + พูดสั่งด้วยเสียง (voice input)** และแนะนำไอเท็ม affiliate เมื่อตู้เสื้อผ้าขาด; มี daily quota ต่อผู้ใช้ (B07d) แสดงโควตาคงเหลือในหน้าแชท                                                                                                                                                                              |
| 3.2 AI Photo Upload & Auto-tag | ✅ ทำแล้ว           | `analyzeClothing` (`analyze.functions.ts`) ใช้ Gemini function calling บังคับเรียก `save_clothing_item` เพื่อกรอกหมวดหมู่/สี/สไตล์ ผ่าน `UploadItem.tsx` + **B09: ลบพื้นหลังแบบ opt-in** (`@imgly/background-removal` client-side + preview/revert) — loop `B09-L1`                                                                                                                                                                                                                 |
| 3.3 Wardrobe Management        | ✅ ทำแล้ว (บางส่วน) | ดู/แก้ไข/ลบไอเท็มได้ (`items.functions.ts`, `WardrobeCard.tsx`, `EditItem.tsx`) + **search** (ชื่อ/สี/สไตล์/tags) และ **filter ตามหมวดหมู่** ใน `wardrobe.tsx` + tag chips สีพาสเทลต่อ tag — ยังไม่มี filter ตามสี/สไตล์, สถิติการใส่ (มี `wearItem` แต่ไม่มีหน้าสถิติ) หรือ mark as donated/to-sell                                                                                                                                                                                |
| 3.4 Outfit History & Calendar  | ✅ ทำแล้ว (บางส่วน) | **บันทึกชุด (Save Match)** + **ปฏิทินประวัติการใส่** (B05): wear-log `outfit_wears` (migration `014`) + ปุ่ม "ใส่ชุดนี้วันนี้" + `OutfitCalendar` (toggle ในหน้า Matches) — loop `B05-L1`. **อัปเดต 2026-08-06:** หนึ่งวัน = หนึ่งชุด (unique `(user_id, worn_date)`, migration `017`, upsert แทน insert), ปุ่ม "ใส่ชุดนี้วันนี้" เป็น toggle (กดซ้ำ = เอาออก, เลือกชุดอื่น = แทนที่), ช่องปฏิทินโชว์รูปตัวอย่าง + hover/tap ดูรายละเอียดชุดเต็ม — เตือนใส่ซ้ำในรอบ N วัน ยัง defer |
| 3.5 In-App Weather Status      | ✅ ทำแล้ว           | การ์ดสภาพอากาศในหน้า Home — OpenWeatherMap (`getWeather` server fn, คีย์ `OPENWEATHER_API_KEY` server-side, `lang=th`) + browser geolocation (fallback กรุงเทพฯ) + hint การแต่งตัวแบบ deterministic ไม่ใช้ push/notification (`weather.functions.ts`, `use-weather.ts`, `WeatherCard.tsx`) — loop `B02-L1`. เดิมคือ Smart Notifications ถูกเปลี่ยนสโคปตาม 3.5                                                                                                                       |
| 3.6 Item Tags                  | ✅ ทำแล้ว           | predefined occasion tags (ทำงาน/ลำลอง/ออกเดท/งานทางการ/เที่ยว/ออกกำลังกาย) เลือกแบบ multi-select chips ใน Add/Edit Item + ค้นหาได้ในหน้า Wardrobe (`010_item_tags.sql`, `ITEM_TAGS` ใน `wardrobe.ts`) — loop `B01-L1`                                                                                                                                                                                                                                                               |
| 3.9 Profile — required fields  | ✅ ทำแล้ว (บางส่วน) | บังคับ name/birthdate/gender ผ่าน blocking onboarding gate (`ProfileGate.tsx` ใน `__root`) + `isProfileComplete` + validation ใน `EditProfileModal`; **โปรไฟล์ย้ายเข้า DB ต่อบัญชีแล้วใน B07a** (ตาราง `profiles` + RLS, `use-profile.ts` บน TanStack Query) — body measurements (optional) เป็น B04 — loop `B03-L1`, `B07a-L1`                                                                                                                                                     |
| 3.8 Authentication (B07a–d ✅) | ✅ ทำแล้ว (บางส่วน) | B07a identity (Supabase email + 6-digit PIN + `profiles` + RLS). B07b items scoped. B07c matches + body_models scoped + body-scan bucket private + signed URLs + `getBodyModel` leak fixed. B07d daily AI quota (chat 30/auto-tag 20, atomic counter). ทั้ง 4 slice เสร็จ; **pending (ดู §13): AUTH-1 email auto-confirm + smoke tests; claim gating; owner-scope storage writes; privatize `wardrobe-images`** — loops `B07a/b/c/d-L1`                                             |

### 11.3 Feature ที่ Build เพิ่มนอกเหนือแผนเดิมใน PRD

| Feature                           | รายละเอียด                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profile & Daily Outfit**        | หน้า Profile (`profile.tsx`, `EditProfileModal.tsx`) เก็บ style preference และแสดงคำแนะนำชุดประจำวัน ผูกกับหน้า Home                                                                                                                                                                                                                                                                                           |
| **Affiliate Shopping (Discover)** | หน้า "ช้อปปิ้ง" (`discover.tsx`) แนะนำไอเท็มจากร้านค้าพาร์ทเนอร์ ~50 ชิ้นในแคตตาล็อก (`affiliate.functions.ts`, migrations `006`–`008`) โดย AI Stylist จะ match ไอเท็มที่ตู้เสื้อผ้าขาดให้อัตโนมัติเมื่อผู้ใช้ถามหา + **B06: filter หมวดหมู่/แบรนด์ + search** (loop `B06-L1`) — ฟีเจอร์นี้ถือเป็นการเริ่ม "แหย่" เข้าใกล้ E-commerce integration ซึ่งเดิมระบุเป็น **Non-Goal (1.4)** ควรทบทวนขอบเขตร่วมกับทีม |
| **Virtual Try-On / Body Model**   | สแกนรูปร่าง (`BodyScanCamera.tsx`, `body-model.functions.ts`, migration `009_body_model.sql`) แล้วสร้างอวตารลองชุดที่บันทึกไว้ (`virtual-model.tsx`, `try-on.functions.ts`) — ปัจจุบันเป็น **mock** (ใช้รูปสำเร็จรูปจาก `public/images` แทนการ generate จริง เนื่องจากติด quota ของ image-gen model) ฟีเจอร์นี้ใกล้เคียงกับ AR ลองเสื้อที่ระบุเป็น **Non-Goal (1.4)** เช่นกัน — ควรทบทวนขอบเขตร่วมกัน          |
| **Voice Input**                   | พูดสั่ง AI Stylist ได้ผ่าน Web Speech API (`use-speech-to-text.ts`, ปุ่มไมค์ใน `StylistChat.tsx`) รองรับภาษาไทย (`th-TH`)                                                                                                                                                                                                                                                                                      |
| **DevTools**                      | `DevTools.tsx` + `use-ai-env.ts` — สลับ **API environment** ของ Gemini (Dev / UAT / Prod, default Prod) ระหว่างพัฒนา จำค่าไว้ใน localStorage แล้วส่ง `env` ไปให้ server fn เลือกคีย์ `AGENT_PLATFORM_API_KEY_*`                                                                                                                                                                                                |
| **Digital Poster**                | หน้าโปสเตอร์ประชาสัมพันธ์แบบ standalone ที่ `/poster` — เป็นไฟล์ static `public/poster/index.html` (มี reveal animation, ambient layers, hover states) เสิร์ฟผ่าน `prod.ts` **ไม่ใช่ TanStack route** จึงไม่ผูกกับ auth gate                                                                                                                                                                                   |

### 11.4 Gap เทียบกับ Roadmap (Section 8)

- **Iteration 1–3** (Foundation, AI Auto-tag, AI Stylist) เสร็จสมบูรณ์แล้ว แม้ใช้ Gemini แทน Claude Vision/Claude API
- **Iteration 4** (UI Polish ด้วย color palette `#d2ccfc`/`#fccce2`/`#cce2fc` + card-based layout) — ผ่านรอบ polish หลายรอบแล้ว (tag chips พาสเทลต่อ tag, mobile modal scroll, item preview แบบ `object-contain`) แต่ยังไม่ได้ verify ว่าตรงกับ 4.2 เป๊ะหรือไม่
- **Iteration 5** (Outfit history calendar, Smart notifications) — Smart Notifications เปลี่ยนเป็น In-App Weather Status แล้ว (ดู 3.5); **calendar view เสร็จแล้วใน B05** (`outfit_wears` + `OutfitCalendar`)
- **Background removal (3.2) เสร็จแล้วใน B09**, search/filter ใน Wardrobe (3.3) เสร็จแล้ว, และ AI rate limit เสร็จแล้วใน **B07d** (chat 30/วัน, auto-tag 20/วัน — เข้มกว่า "regenerate ≥ 5 ครั้ง/วัน" ใน 3.1) — คงเหลือใน 3.3: สถิติการใส่, mark as donated/to-sell

---

## 12. Updated Roadmap — Backlog เรียงตาม Dependency & Difficulty (as of 2026-08-06)

> แทนที่ลำดับความสำคัญเดิมใน Section 8 สำหรับงานที่ยังไม่เริ่ม เรียงจาก dependency น้อย/ง่ายสุดไปมาก/ยากสุด Virtual Try-On ถูกจัดไว้ท้ายสุดตามที่ตกลง (ยากสุด)
>
> แต่ละ backlog มี ID (`B01`–`B10`) ใช้อ้างอิงใน `LOOP.md` และ loop docs (`loops/<ID>-L<n>.md`)
>
> **สถานะคิว:** B01–B03, B05–B07, B09, B10 ✅ · B04 ⏭️ (รวมเข้า B08) · **เหลือ B08 — Virtual Try-On (Tier 5) เป็นรายการเดียวในคิว** ส่วนงานที่ค้างนอกคิวอยู่ใน §13

### Tier 1 — Quick wins (ไม่มี dependency, ง่าย)

1. **B01 — Item Tags** ✅ (3.6) — predefined occasion tags + multi-select chips ใน Add/Edit + ค้นหาใน Wardrobe (loop `B01-L1`, migration `010`)
2. **B02 — In-App Weather Status** ✅ (3.5) — OpenWeatherMap (คีย์ server-side) + geolocation → การ์ดสภาพอากาศในหน้า Home พร้อม hint การแต่งตัว (loop `B02-L1`, ไม่มี migration)
3. **B03 — Profile required fields** ✅ — name/birthdate/gender (3.9) — blocking onboarding gate ใน `__root` + form validation, โปรไฟล์ยังอยู่ localStorage (loop `B03-L1`, ไม่มี migration)

### Tier 2 — ต่อยอดจาก Tier 1 ตรง ๆ, ยาก medium-low

4. **B04 — Profile optional body measurements** ⏭️ (3.9) — **deferred → รวมเข้า B08** (grill 2026-07-19: YAGNI — Virtual Try-On เป็น consumer เดียว, อยู่ท้ายสุด + ยัง mock; height/weight มีอยู่แล้ว) เพิ่มฟิลด์วัดสัดส่วนตอน B08 กำหนดว่าต้องใช้อะไรจริง (loop `B04-L1`)
5. **B05 — Outfit History Calendar view** ✅ (3.4) (loop `B05-L1`, migration `014`) — wear-log ใหม่ `outfit_wears` (match มี save-date อย่างเดียว ไม่มี worn-date) + ปุ่ม "ใส่ชุดนี้วันนี้" + ปฏิทินรายเดือน (toggle ในหน้า Matches); re-wear prevention ยัง defer

### Tier 3 — Medium (ได้ประโยชน์จาก Tier 1 แต่ไม่ blocked)

6. **B06 — Affiliate Shopping UI Polish** ✅ (3.7) (loop `B06-L1`, client-side only) — category chips + brand(store) dropdown + search (name+desc) บนหน้า Discover; single-select AND-combined (grill: brand-only ไม่มี platform filter; "tag taxonomy จาก B01" ตัดออกเพราะ affiliate มี category/style ไม่ใช่ occasion tags)
7. **B10 — Affiliate catalog admin editor** ✅ (3.7) (loop `B10-L1`, no migration; **precondition ADMIN-1**) — CRUD `affiliate_products` แก้เอง (seed data เป็น placeholder: ไม่มี image_url จริง, affiliate_url เป็น search URL). Grill 2026-07-19: **ไม่ scrape** (ผิด ToS Shopee/Lazada + copyright รูป + scraped URL ไม่ใช่ affiliate จริง); `affiliate_url` = **plain product deep-link** (ไม่ใช่ commission link); image = **paste image URL + live preview** (ไม่ re-host); access = **env `ADMIN_EMAILS` allowlist** (= กลไก AUTH-2 ใช้ซ้ำได้). Server fns + admin check, ไม่มี migration (writes ผ่าน service-role)

### Tier 4 — High difficulty, foundational (ไม่ blocked แต่เสี่ยงสูง)

8. **B07 — Authentication** ✅ (3.8) (B07a–d เสร็จครบ; **pending human: AUTH-1 email auto-confirm + smoke tests** ดู §13) — แตกเป็น 4 loop ย่อย (ตัดสินใจจาก grill 2026-07-19): identity ก่อน แล้ว scope ข้อมูลทีละตาราง · Supabase Auth (email + 6-digit PIN) · user-scoped client + RLS `auth.uid()=user_id` (service-role เหลือเฉพาะ admin ops) · guest pool เดิม claim-all → seed account (บัญชีแรกที่สมัคร; per-guest migrate เป็นไปไม่ได้เพราะ session_id ถูก drop ใน 004) · ทำก่อน Virtual Try-On เพราะ scan ร่างกายควรอยู่ใต้บัญชีจริง
   - **B07a — Auth identity foundation** ✅ (loop `B07a-L1`, migration `011`; pending: เปิด email auto-confirm ใน Supabase + smoke test สมัคร/เข้าสู่ระบบจริง) — register/login/logout + auth gate ใน `__root` (unauth→login, authed+incomplete→onboarding gate เดิม, else→app) + ผูก middleware/attacher ใน `start.ts` + ตาราง `profiles` (ย้ายโปรไฟล์ localStorage → DB ต่อยอด B03) พิสูจน์ path token→RLS ครบวง
   - **B07b — Scope items → user_id** ✅ (loop `B07b-L1`, migration `012`) — item fns ใช้ user-scoped client + RLS `auth.uid()=user_id`, `saveItem` เขียน `user_id`, owner check ผ่าน RLS (แก้ id-only delete + IDOR ตอน removeItem), backfill via `claimOrphanItems` (ปุ่มใน profile, one-time); **ค้าง: ตัดสินใจ gate การ claim สำหรับ multi-user** (ดู loop doc)
   - **B07c — Scope matches + body-model** ✅ (loop `B07c-L1`, migration `013`) — RLS `auth.uid()=user_id` บน matches + body_models (user-scoped client), แก้ `getBodyModel` global-latest leak, ปิด bucket รูปสแกนเป็น private + signed URLs (รวม `try-on.functions`), claimOrphans ครอบคลุม 3 ตาราง; **follow-up: owner-scope storage write/delete ทั้งสอง bucket, privatize `wardrobe-images`**
   - **B07d — Per-user quota** ✅ (loop `B07d-L1`, migration `015`) — daily AI cap ต่อผู้ใช้: chat 30/วัน, auto-tag 20/วัน (atomic `bump_ai_usage` reserve-a-slot + RLS), hard block + ข้อความไทย, ผูก `requireSupabaseAuth` เข้า `matchChat`/`analyzeClothing`; **pending: live smoke test 31 chats/21 analyzes**

### Tier 5 — Last (ยากสุดตามที่ตกลง)

9. **B08 — Virtual Try-On** (3.10) — ต้องแก้ quota/เปลี่ยน image-gen model ก่อนถึงจะ generate จริงได้ (ปัจจุบัน mock) และควรอยู่หลัง Authentication (Tier 4). **รวมงาน B04 (optional body measurements) เข้ามาด้วย** — เพิ่มฟิลด์วัดสัดส่วนบน `profiles` (DB-backed จาก B07a) ตามที่ try-on ต้องใช้จริง

### ไม่รวมในลำดับ (ตัดสินใจแล้ว)

- **B09 — Background removal** ✅ (3.2) (loop `B09-L1`) — `@imgly/background-removal` client-side (ฟรี, on-device) + opt-in preview/revert ใน UploadItem; resolves Open Question 9.5

---

## 13. Action Items — Follow-ups & Tech Debt

> Cross-cutting deferrals surfaced by the loop scrutinize passes (not feature backlog). Newest first.

| ID          | Item                                                                                                                                                                                         | Source  | Priority | Notes                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| **AUTH-1**  | Enable **email auto-confirm** in the Supabase dashboard, then smoke-test signup→login→logout live                                                                                            | B07a-L1 | **High** | Auth doesn't work end-to-end until this dashboard toggle; register currently dead-ends at "confirm your email"      |
| **QUOTA-1** | Live smoke-test the AI quota: 31 stylist chats / 21 auto-tags → the 31st/21st blocks with the Thai toast, no `permission denied`                                                             | B07d-L1 | Medium   | Static analysis + precedent say the RPC grants work; needs one real logged-in run (depends on AUTH-1)               |
| **ADMIN-1** | Admin editor (B10) trusts the JWT email claim: enable Supabase **email confirmation** + **pre-register** every `ADMIN_EMAILS` account before go-live, else admin-email squatting is possible | B10-L1  | **High** | Deploy precondition, not a code fix; ties to AUTH-1 (auto-confirm). Also set `ADMIN_EMAILS` in `.env`               |
| **SEC-1**   | Owner-scope storage **INSERT/DELETE** policies on `body-model-images` **and** `wardrobe-images` (currently `bucket_id`-only → anon key can blind upload/delete)                              | B07c-L1 | Medium   | Reads are now private; writes/deletes still open. Not data theft (no list policy, random UUIDs) but junk-upload/DoS |
| **SEC-2**   | Privatize the **`wardrobe-images`** bucket + signed URLs (item photos are world-readable by URL today)                                                                                       | B07b-L1 | Medium   | Same signed-URL treatment as B07c body-scan bucket                                                                  |
| **AUTH-2**  | Decide `claimOrphans` **multi-user gating** (admin allowlist / one-shot migration / accept for solo)                                                                                         | B07b-L1 | Low      | Mitigated to first-run-per-account (button hidden once you own items)                                               |
| **DX-1**    | Add **`tsc` to the gate** + fix pre-existing type errors (`ShareMatchModal.tsx` null guards, `server.ts` needs `@types/bun`)                                                                 | B07b-L1 | Low      | `bun run build` (Vite) doesn't type-check, so real type errors slip through                                         |
