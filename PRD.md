# PRD — Digital Wardrobe with AI Stylist

**Version:** 1.0
**Date:** 2026-05-16
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

| Persona | Description | Pain Point |
|---------|-------------|------------|
| **มินิ – Office Worker (28)** | ทำงานออฟฟิศ ต้องแต่งตัวให้ดูดี 5 วัน/สัปดาห์ | คิดชุดไม่ออกทุกเช้า |
| **เจน – Student (20)** | นักศึกษามหา'ลัย ชอบแฟชั่น | ตู้รก จำไม่ได้ว่ามีอะไร |
| **โอม – Casual Dresser (32)** | ผู้ชายที่อยากแต่งตัวให้ดูดีแต่ไม่มีเวลา | ไม่รู้ว่าเสื้อผ้าชิ้นไหนเข้ากัน |

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
2. ระบบลบพื้นหลังอัตโนมัติ (background removal)
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
- ค้นหา (search bar)
- สถิติ: เสื้อผ้าทั้งหมด, ใช้บ่อยที่สุด, ไม่ได้ใส่นานสุด
- Mark as "donated" / "to-sell"

---

### 3.4 Feature: Outfit History & Calendar (P1)
**Description:** บันทึกชุดที่ใส่แต่ละวัน + ปฏิทินย้อนหลัง

- กด "ใส่วันนี้" จากชุดที่ AI แนะนำ
- ดูชุดที่เคยใส่ในวันที่ผ่านมา
- ป้องกันใส่ชุดซ้ำในระยะเวลาใกล้กัน

---

### 3.5 Feature: Smart Notifications (P2)
- แจ้งเตือนตอนเช้า: "วันนี้ฝนตก แนะนำเสื้อแขนยาว + รองเท้ากันน้ำ"
- แจ้งเตือนเสื้อผ้าที่ไม่ได้ใส่นาน

---

## 4. UI / UX Design

### 4.1 Visual Style
แรงบันดาลใจจาก reference (health app card-based UI):
- **Card-based layout** — แต่ละการ์ดมี border-radius ~24px
- **Soft shadow** + พื้นหลังขาวสะอาด
- **Iconography** กลม นุ่มนวล
- **Typography** sans-serif, bold heading

### 4.2 Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| `--primary-purple` | `#d2ccfc` | Hero cards, primary CTA, AI Stylist section |
| `--primary-pink`   | `#fccce2` | Wardrobe section, "ใส่วันนี้" CTA |
| `--primary-blue`   | `#cce2fc` | Weather/context cards, secondary actions |
| `--neutral-bg`     | `#FAFAFA` | App background |
| `--text-primary`   | `#1A1A1A` | Main text |
| `--text-secondary` | `#6B6B6B` | Captions |

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
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/items` | POST | อัปโหลดรูป + รับ AI tags |
| `/items` | GET | ดึงรายการเสื้อผ้า |
| `/items/:id` | PUT / DELETE | แก้ไข / ลบ |
| `/stylist/suggest` | POST | รับ context → คืน outfit suggestions |
| `/stylist/feedback` | POST | บันทึก like/dislike |
| `/outfits/history` | GET | ดู outfit ย้อนหลัง |

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

| Metric | Target |
|--------|--------|
| Daily Active Users (DAU) | +20% MoM |
| Avg. items uploaded / user | ≥ 20 ชิ้น ภายในเดือนแรก |
| AI suggestion acceptance rate (❤️) | ≥ 70% |
| Time to add new item | < 10 วินาที |
| Weekly retention (W1) | ≥ 40% |
| Crash-free sessions | ≥ 99.5% |

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

---

## 10. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI tagging ไม่แม่นยำกับเสื้อผ้าไทย/เอเชีย | High | เก็บ feedback ผู้ใช้ → fine-tune |
| ต้นทุน AI API สูง | Medium | Cache + จำกัด regenerate/วัน |
| ผู้ใช้ขี้เกียจอัปโหลดเสื้อผ้า | High | Bulk upload, gamification |
| Privacy concerns (รูปเสื้อผ้าส่วนตัว) | Medium | E2E encryption + clear privacy policy |
