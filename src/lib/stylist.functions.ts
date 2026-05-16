import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  wardrobe: z.string().min(1).max(8000),
});

export const stylistChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.AGENT_PLATFORM_API_KEY;
    if (!apiKey) throw new Error("AGENT_PLATFORM_API_KEY ไม่ได้ตั้งค่า");

    const ai = new GoogleGenAI({ apiKey });

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

    const contents = data.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction: system },
    });

    return { reply: response.text ?? "" };
  });
