import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  wardrobe: z.string().min(1).max(8000),
});

export const stylistChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ไม่ได้ตั้งค่า");

    const system = `คุณคือ AI Stylist สำหรับแอป Digital Wardrobe ผู้ใช้งานเป็นคนไทย ตอบเป็นภาษาไทยเสมอ
หน้าที่: แนะนำการจับคู่ชุดจากเสื้อผ้าที่ผู้ใช้มี โดยพิจารณาสไตล์ส่วนตัว โอกาส สี รูปทรง เทรนด์ และสภาพอากาศ

ข้อกำหนด:
- แนะนำจากไอเท็มในตู้เสื้อผ้าก่อน อ้างชื่อไอเท็มตรง ๆ
- หากไม่มีไอเท็มเหมาะสม แนะนำของที่ควรซื้อเพิ่ม (ระบุชัดเจนว่า "แนะนำซื้อเพิ่ม")
- อธิบายเหตุผลที่เลือกอย่างกระชับ (2-4 บรรทัด)
- หลีกเลี่ยงคำแนะนำไม่เหมาะกับบริบท เช่น ชุดไม่สุภาพกับงานทางการ
- ถ้าข้อมูลไม่พอ (โอกาสใส่ สภาพอากาศ สไตล์ที่ต้องการ) ให้ถามคำถามเพิ่มก่อนแนะนำชุด — ห้ามเดา
- ตอบสั้น กระชับ ใช้ bullet เมื่อเหมาะสม

ตู้เสื้อผ้าของผู้ใช้ (JSON):
${data.wardrobe}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (res.status === 429) throw new Error("ใช้งานเกินโควต้าชั่วคราว กรุณาลองใหม่");
    if (res.status === 402) throw new Error("ต้องเติมเครดิตใน Lovable AI");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);

    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return { reply: json.choices[0]?.message?.content ?? "" };
  });
