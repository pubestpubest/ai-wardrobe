import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(8_000_000),
});

const CATEGORIES = ["top", "bottom", "outerwear", "shoes", "dress", "accessory"] as const;
const FORMALITY = ["casual", "smart-casual", "formal"] as const;

export const analyzeClothing = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ไม่ได้ตั้งค่า");

    const tool = {
      type: "function",
      function: {
        name: "save_clothing_item",
        description: "บันทึกข้อมูลเสื้อผ้าจากรูปภาพ",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "ชื่อไอเท็มสั้น ๆ ภาษาไทย เช่น 'เสื้อเชิ้ตขาว'" },
            category: { type: "string", enum: CATEGORIES },
            color: { type: "string", description: "สีหลักภาษาไทย" },
            style: {
              type: "array",
              items: { type: "string" },
              description: "แท็กสไตล์ 2-4 คำ ภาษาอังกฤษ เช่น minimal, casual, cute",
            },
            formality: { type: "string", enum: FORMALITY },
            emoji: { type: "string", description: "1 emoji ที่เหมาะกับไอเท็ม" },
          },
          required: ["name", "category", "color", "style", "formality", "emoji"],
          additionalProperties: false,
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "คุณเป็นผู้เชี่ยวชาญด้านแฟชั่น วิเคราะห์รูปเสื้อผ้าและกรอกข้อมูลผ่าน tool save_clothing_item เท่านั้น ตอบเป็นภาษาไทยในฟิลด์ที่กำหนด",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "วิเคราะห์ไอเท็มในรูปนี้และบันทึกข้อมูล" },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "save_clothing_item" } },
      }),
    });

    if (res.status === 429) throw new Error("ใช้งานเกินโควต้าชั่วคราว");
    if (res.status === 402) throw new Error("ต้องเติมเครดิตใน Lovable AI");
    if (!res.ok) throw new Error(`AI error: ${res.status}`);

    const json = (await res.json()) as {
      choices: { message: { tool_calls?: { function: { arguments: string } }[] } }[];
    };
    const args = json.choices[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("AI ไม่ได้ส่งข้อมูลกลับ");
    return JSON.parse(args) as {
      name: string;
      category: (typeof CATEGORIES)[number];
      color: string;
      style: string[];
      formality: (typeof FORMALITY)[number];
      emoji: string;
    };
  });
