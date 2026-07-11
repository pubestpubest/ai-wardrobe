import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FunctionCallingConfigMode, GoogleGenAI, Type } from "@google/genai";
import { withRetry } from "./retry";
import type { AffiliateProduct, MatchSuggestion, WardrobeItem } from "./wardrobe";
import { findAffiliateProduct } from "./affiliate.functions";

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
  mode: z.enum(["empty", "incomplete", "complete"]).optional().default("incomplete"),
  forceAffiliate: z.boolean().optional().default(false),
});

export type MatchChatResult = {
  reply: string;
  suggestion?: MatchSuggestion;
  affiliateItems?: AffiliateProduct[];
};

const VALID_CATEGORIES: WardrobeItem["category"][] = [
  "top",
  "bottom",
  "outerwear",
  "shoes",
  "dress",
  "accessory",
];

export const matchChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<MatchChatResult> => {
    const apiKey = API_KEYS[data.env ?? "prod"];
    if (!apiKey) throw new Error(`API key สำหรับ env "${data.env ?? "prod"}" ไม่ได้ตั้งค่า`);

    const ai = new GoogleGenAI({ apiKey });

    const modeHint =
      data.mode === "complete"
        ? `\nหมายเหตุ: ตู้เสื้อผ้าของผู้ใช้ครบชุดแล้ว (มีครบทั้งท่อนบน/ล่างหรือเดรส และรองเท้า) การแนะนำไอเท็มจากร้านค้าจึงควรมองในเชิงแฟชั่น เช่น เครื่องประดับที่ช่วยยกระดับลุค หรือไอเท็มทางเลือกที่เข้ากับสไตล์/โอกาส/โทนสีได้ดีกว่า โดยพิจารณาจากรสนิยมแฟชั่น (ความกลมกลืนของสี ความเข้ากันของสไตล์ ความเหมาะกับโอกาส ความหลากหลายในการมิกซ์แอนด์แมตช์) ไม่ใช่เพราะไอเท็มเดิมคุณภาพต่ำหรือราคาถูก`
        : "";
    const forceHint = data.forceAffiliate
      ? `\nรอบนี้ให้แนะนำไอเท็มจากร้านค้าอย่างน้อย 1 ชิ้นเสมอ (เน้นเครื่องประดับหรือไอเท็มที่ช่วยยกระดับลุคในเชิงแฟชั่น) โดยเรียก suggest_affiliate_item`
      : "";

    const system = `คุณคือ AI Stylist สำหรับแอป Digital Wardrobe ผู้ใช้งานเป็นคนไทย ตอบเป็นภาษาไทยเสมอ
หน้าที่:
1) ตอบคำถามเกี่ยวกับตู้เสื้อผ้าของผู้ใช้ (เช่น "เสื้อสีฟ้ามีกี่ตัว", "ลิสต์ของที่เป็นทางการ") — ตอบเป็นข้อความปกติ
2) แนะนำชุด (match) เมื่อผู้ใช้ขอ — ต้องเรียก tool suggest_outfit_match เพื่อส่งโครงสร้างชุดที่แนะนำ พร้อม itemIds จากตู้
3) การแนะนำไอเท็มจากร้านค้าภายนอก (suggest_affiliate_item):
   - ถ้าชุดที่แนะนำในข้อ 2) ขาดไอเท็มสำคัญที่ตู้เสื้อผ้าไม่มี (เช่น ไม่มีรองเท้าที่เข้ากัน) ให้เรียก suggest_affiliate_item ใน response เดียวกันกับ suggest_outfit_match โดยระบุ category ให้ตรงกับ enum ที่กำหนด เพื่อเติมชุดให้ครบ
   - ถ้าตู้เสื้อผ้าของผู้ใช้มีไอเท็มครบชุดอยู่แล้ว คุณยังสามารถเรียก suggest_affiliate_item ได้ โดยแนะนำ "เครื่องประดับ" ที่ช่วยยกระดับลุค หรือไอเท็ม "ทางเลือก" ที่เข้ากับสไตล์และโอกาสได้ดีขึ้นในเชิงแฟชั่น (โทนสี ความเข้ากันของสไตล์ ความเหมาะกับโอกาส) — ไม่ใช่เพราะไอเท็มเดิมคุณภาพต่ำหรือราคาถูก และถ้าเป็นการแนะนำให้เปลี่ยน ให้บอกในข้อความตอบกลับอย่างเป็นธรรมชาติ (เช่น "ลองเปลี่ยนรองเท้าเป็น...เพื่อให้ลุคดูเรียบหรูขึ้น")
   - คุณเรียก suggest_affiliate_item ได้มากกว่า 1 ครั้งใน response เดียว ถ้ามีหลายไอเท็มที่ช่วยให้ลุคดีขึ้น
   - สำคัญ: เมื่อผู้ใช้ขอไอเท็มเฉพาะเจาะจง (เช่น "แว่นตา", "กระเป๋า", "เข็มขัด") ให้ใส่ keyword เป็นชื่อ/ประเภทไอเท็มนั้นเสมอ โดยเฉพาะหมวด accessory ที่มีหลายชนิด เพื่อเลือกสินค้าให้ตรงกับที่ผู้ใช้ขอ${modeHint}${forceHint}

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
                {
                  name: "suggest_affiliate_item",
                  description:
                    "แนะนำไอเท็มจากร้านค้าภายนอก — ใช้เติมชุดให้ครบเมื่อตู้ขาดไอเท็ม หรือแนะนำเครื่องประดับ/ไอเท็มทางเลือกเชิงแฟชั่นเมื่อตู้ครบแล้ว",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      category: {
                        type: Type.STRING,
                        format: "enum",
                        enum: VALID_CATEGORIES,
                        description: "หมวดหมู่ของไอเท็มที่แนะนำ",
                      },
                      keyword: {
                        type: Type.STRING,
                        description:
                          "ชื่อ/ประเภทไอเท็มที่ต้องการแบบเจาะจง เช่น 'แว่นกันแดด', 'กระเป๋าสะพาย', 'เข็มขัด' — สำคัญมากเมื่อ category กว้าง (เช่น accessory มีทั้งแว่น กระเป๋า เข็มขัด) ให้ระบุเสมอเมื่อผู้ใช้ขอไอเท็มเฉพาะ",
                      },
                      color: {
                        type: Type.STRING,
                        description: "สีที่ต้องการ (ถ้ามี)",
                      },
                      style: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "แท็กสไตล์ที่ต้องการ (ถ้ามี)",
                      },
                      formality: {
                        type: Type.STRING,
                        description:
                          "ระดับความเป็นทางการ เช่น casual, smart-casual, formal (ถ้ามี)",
                      },
                    },
                    required: ["category"],
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

    const calls = response.functionCalls ?? [];
    const text = response.text ?? "";

    let suggestion: MatchSuggestion | undefined;
    let suggestionReason: string | undefined;
    const collectedAffiliates: AffiliateProduct[] = [];

    for (const fc of calls) {
      if (fc.name === "suggest_outfit_match" && !suggestion) {
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

          suggestion = { name, itemIds, occasion, reason };
          suggestionReason = reason;
        }
      } else if (fc.name === "suggest_affiliate_item") {
        const args = fc.args as {
          category?: unknown;
          keyword?: unknown;
          color?: unknown;
          style?: unknown;
          formality?: unknown;
        };
        const category = typeof args.category === "string" ? args.category : undefined;
        if (category && (VALID_CATEGORIES as string[]).includes(category)) {
          const keyword =
            typeof args.keyword === "string" && args.keyword.trim()
              ? args.keyword.trim()
              : undefined;
          const color =
            typeof args.color === "string" && args.color.trim() ? args.color.trim() : undefined;
          const formality =
            typeof args.formality === "string" && args.formality.trim()
              ? args.formality.trim()
              : undefined;
          const style = Array.isArray(args.style)
            ? (args.style as unknown[]).filter((s): s is string => typeof s === "string")
            : undefined;

          const product = await findAffiliateProduct({
            category: category as WardrobeItem["category"],
            keyword,
            color,
            style,
            formality: formality as WardrobeItem["formality"] | undefined,
          });
          if (product) collectedAffiliates.push(product);
        }
      }
    }

    const seen = new Set<string>();
    const affiliateItems: AffiliateProduct[] = collectedAffiliates.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    // Forced fallback: flash-lite often ignores tool instructions, so on a forced
    // turn with no rec produced, guarantee one accessory recommendation.
    if (data.forceAffiliate && affiliateItems.length === 0) {
      const fallback = await findAffiliateProduct({ category: "accessory" });
      if (fallback) affiliateItems.push(fallback);
    }

    const reply = suggestion ? text.trim() || suggestionReason || "" : text;

    return {
      reply,
      suggestion,
      affiliateItems: affiliateItems.length ? affiliateItems : undefined,
    };
  });
