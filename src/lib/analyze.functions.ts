import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FunctionCallingConfigMode, GoogleGenAI, Type } from "@google/genai";
import { withRetry } from "./retry";
import { logAiUsage, type UsageMetadata } from "./ai-log";

const MODEL = "gemini-3.1-flash-lite";

const API_KEYS: Record<string, string | undefined> = {
  dev: process.env.AGENT_PLATFORM_API_KEY_DEV,
  uat: process.env.AGENT_PLATFORM_API_KEY_UAT,
  prod: process.env.AGENT_PLATFORM_API_KEY_PROD ?? process.env.AGENT_PLATFORM_API_KEY,
};

const InputSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(8_000_000),
  env: z.enum(["dev", "uat", "prod"]).optional(),
});

const CATEGORIES = ["top", "bottom", "outerwear", "shoes", "dress", "accessory"] as const;
const FORMALITY = ["casual", "smart-casual", "formal"] as const;

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!match) throw new Error("รูปต้องเป็น JPEG, PNG, GIF หรือ WebP");
  return { mimeType: match[1], data: match[2] };
}

export const analyzeClothing = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = API_KEYS[data.env ?? "prod"];
    if (!apiKey) throw new Error(`API key สำหรับ env "${data.env ?? "prod"}" ไม่ได้ตั้งค่า`);

    const ai = new GoogleGenAI({ apiKey });
    const { mimeType, data: imageData } = parseDataUrl(data.imageDataUrl);
    const imageBytes = Math.ceil((imageData.length * 3) / 4);
    const t0 = Date.now();

    let response;
    try {
      response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL,
          contents: [
            {
              role: "user",
              parts: [
                { text: "วิเคราะห์ไอเท็มในรูปนี้และบันทึกข้อมูล" },
                { inlineData: { mimeType, data: imageData } },
              ],
            },
          ],
          config: {
            systemInstruction:
              "คุณเป็นผู้เชี่ยวชาญด้านแฟชั่น วิเคราะห์รูปเสื้อผ้าและกรอกข้อมูลผ่าน tool save_clothing_item เท่านั้น ตอบเป็นภาษาไทยในฟิลด์ที่กำหนด",
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "save_clothing_item",
                    description: "บันทึกข้อมูลเสื้อผ้าจากรูปภาพ",
                    parameters: {
                      type: Type.OBJECT,
                      properties: {
                        name: {
                          type: Type.STRING,
                          description: "ชื่อไอเท็มสั้น ๆ ภาษาไทย เช่น 'เสื้อเชิ้ตขาว'",
                        },
                        category: { type: Type.STRING, enum: [...CATEGORIES] },
                        color: { type: Type.STRING, description: "สีหลักภาษาไทย" },
                        style: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "แท็กสไตล์ 2-4 คำ ภาษาอังกฤษ เช่น minimal, casual, cute",
                        },
                        formality: { type: Type.STRING, enum: [...FORMALITY] },
                        emoji: { type: Type.STRING, description: "1 emoji ที่เหมาะกับไอเท็ม" },
                      },
                      required: ["name", "category", "color", "style", "formality", "emoji"],
                    },
                  },
                ],
              },
            ],
            toolConfig: {
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.ANY,
                allowedFunctionNames: ["save_clothing_item"],
              },
            },
          },
        }),
      );
    } catch (err) {
      logAiUsage({
        fn: "analyzeClothing",
        model: MODEL,
        durationMs: Date.now() - t0,
        ok: false,
        extras: { env: data.env ?? "prod", imageBytes, mimeType },
        error: err,
      });
      throw err;
    }

    const fc = response.functionCalls?.[0];
    logAiUsage({
      fn: "analyzeClothing",
      model: MODEL,
      usage: response.usageMetadata as UsageMetadata | undefined,
      durationMs: Date.now() - t0,
      ok: !!fc,
      extras: {
        env: data.env ?? "prod",
        imageBytes,
        mimeType,
        toolCalled: fc?.name ?? null,
      },
    });
    if (!fc) throw new Error("AI ไม่ได้ส่งข้อมูลกลับ");

    return fc.args as {
      name: string;
      category: (typeof CATEGORIES)[number];
      color: string;
      style: string[];
      formality: (typeof FORMALITY)[number];
      emoji: string;
    };
  });
