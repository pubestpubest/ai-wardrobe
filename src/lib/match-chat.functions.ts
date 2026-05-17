import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FunctionCallingConfigMode, GoogleGenAI, Type } from "@google/genai";
import { withRetry } from "./retry";
import type { MatchSuggestion } from "./wardrobe";

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
  wardrobeIds: z.array(z.string()).default([]),
});

export type MatchChatResult = {
  reply: string;
  suggestion?: MatchSuggestion;
};

export const matchChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<MatchChatResult> => {
    const apiKey = API_KEYS[data.env ?? "prod"];
    if (!apiKey) throw new Error(`API key สำหรับ env "${data.env ?? "prod"}" ไม่ได้ตั้งค่า`);

    const ai = new GoogleGenAI({ apiKey });

    const system = `คุณคือ AI Stylist สำหรับแอป Digital Wardrobe ผู้ใช้งานเป็นคนไทย ตอบเป็นภาษาไทยเสมอ
หน้าที่:
1) ตอบคำถามเกี่ยวกับตู้เสื้อผ้าของผู้ใช้ (เช่น "เสื้อสีฟ้ามีกี่ตัว", "ลิสต์ของที่เป็นทางการ") — ตอบเป็นข้อความปกติ
2) แนะนำชุด (match) เมื่อผู้ใช้ขอ — ต้องเรียก tool suggest_outfit_match เพื่อส่งโครงสร้างชุดที่แนะนำ พร้อม itemIds จากตู้

ข้อกำหนดการแนะนำชุด:
- เลือก itemIds จาก JSON ของตู้เสื้อผ้าด้านล่างเท่านั้น ห้ามคิด id ขึ้นเอง
- ตั้งชื่อ name ภาษาไทยสั้น ๆ ที่สื่อสไตล์ของชุด เช่น "ชุดคาเฟ่วันหยุด"
- ใส่ occasion (โอกาส) ถ้ามีบริบทชัดเจน
- reason: อธิบายเหตุผลกระชับ 1-2 ประโยค ภาษาไทย
- ถ้าข้อมูลไม่พอ (โอกาส สภาพอากาศ สไตล์) ให้ถามก่อน — ห้ามเดา ไม่ต้องเรียก tool
- เลือก 2-6 ไอเท็ม รวมเสื้อผ้าครบเซ็ตที่สมเหตุสมผล

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
        config: {
          systemInstruction: system,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "suggest_outfit_match",
                  description: "ส่งชุดที่แนะนำให้ผู้ใช้ ประกอบด้วย itemIds จากตู้เสื้อผ้า",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      name: {
                        type: Type.STRING,
                        description: "ชื่อชุดสั้น ๆ ภาษาไทย เช่น 'ชุดคาเฟ่วันหยุด'",
                      },
                      itemIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "id ของไอเท็มจากตู้ (2-6 ชิ้น)",
                      },
                      occasion: {
                        type: Type.STRING,
                        description: "โอกาสที่เหมาะ เช่น ทำงาน, ปาร์ตี้",
                      },
                      reason: {
                        type: Type.STRING,
                        description: "เหตุผลการจับคู่ ภาษาไทย 1-2 ประโยค",
                      },
                    },
                    required: ["name", "itemIds", "reason"],
                  },
                },
              ],
            },
          ],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
          },
        },
      }),
    );

    const fc = response.functionCalls?.[0];
    const text = response.text ?? "";

    if (fc && fc.name === "suggest_outfit_match") {
      const args = fc.args as {
        name?: unknown;
        itemIds?: unknown;
        occasion?: unknown;
        reason?: unknown;
      };
      const validIds = new Set(data.wardrobeIds);
      const rawIds = Array.isArray(args.itemIds) ? (args.itemIds as unknown[]) : [];
      const itemIds = rawIds
        .filter((x): x is string => typeof x === "string")
        .filter((id) => validIds.has(id));

      if (itemIds.length >= 1) {
        const name =
          typeof args.name === "string" && args.name.trim() ? args.name.trim() : "ชุดแนะนำ";
        const reason =
          typeof args.reason === "string" && args.reason.trim()
            ? args.reason.trim()
            : "ฉันเลือกชุดนี้จากไอเท็มในตู้ของคุณค่ะ";
        const occasion =
          typeof args.occasion === "string" && args.occasion.trim()
            ? args.occasion.trim()
            : undefined;

        return {
          reply: text.trim() || reason,
          suggestion: { name, itemIds, occasion, reason },
        };
      }
    }

    return { reply: text };
  });
