import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { withRetry } from "./retry";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const API_KEYS: Record<string, string | undefined> = {
  dev: process.env.AGENT_PLATFORM_API_KEY_DEV,
  uat: process.env.AGENT_PLATFORM_API_KEY_UAT,
  prod: process.env.AGENT_PLATFORM_API_KEY_PROD ?? process.env.AGENT_PLATFORM_API_KEY,
};

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  wardrobe: z.string().min(1).max(8000),
  env: z.enum(["dev", "uat", "prod"]).optional(),
});

export const stylistChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = API_KEYS[data.env ?? "prod"];
    if (!apiKey) throw new Error(`API key สำหรับ env "${data.env ?? "prod"}" ไม่ได้ตั้งค่า`);

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

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents,
        config: { systemInstruction: system },
      }),
    );

    return { reply: response.text ?? "" };
  });
