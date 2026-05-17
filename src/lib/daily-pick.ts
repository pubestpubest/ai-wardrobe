import type { MatchSuggestion, WardrobeItem } from "./wardrobe";

export type DailyPick = {
  userText: string;
  reply: string;
  suggestion: MatchSuggestion;
};

const NAMES = ["ลุควันนี้", "ชุดวันนี้", "Outfit of the Day", "สไตล์ของวันนี้"];
const USER_PROMPTS = ["วันนี้ใส่อะไรดี?", "ขอชุดวันนี้หน่อย", "ขอลุควันนี้", "Daily pick please"];
const REPLIES = [
  "ลองดูชุดนี้ดูค่ะ ✨",
  "นี่คือลุคที่ฉันแนะนำสำหรับวันนี้ค่ะ",
  "ฉันจัดชุดนี้ให้คุณแล้วค่ะ ลองดูได้เลย",
];
const FORMALITY_LABEL: Record<WardrobeItem["formality"], string> = {
  casual: "ลำลอง",
  "smart-casual": "สมาร์ทแคชชวล",
  formal: "ทางการ",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomOutfit(items: WardrobeItem[]): DailyPick | null {
  if (items.length === 0) return null;

  const tops = items.filter((i) => i.category === "top");
  const bottoms = items.filter((i) => i.category === "bottom");
  const dresses = items.filter((i) => i.category === "dress");
  const shoes = items.filter((i) => i.category === "shoes");
  const outer = items.filter((i) => i.category === "outerwear");
  const accs = items.filter((i) => i.category === "accessory");

  const canTopBottom = tops.length > 0 && bottoms.length > 0;
  const useDress = dresses.length > 0 && (!canTopBottom || Math.random() < 0.4);

  const outfit: WardrobeItem[] = [];

  if (useDress) {
    outfit.push(pick(dresses));
  } else if (canTopBottom) {
    const top = pick(tops);
    const sameForm = bottoms.filter((b) => b.formality === top.formality);
    outfit.push(top);
    outfit.push(pick(sameForm.length ? sameForm : bottoms));
  } else if (tops.length > 0) {
    outfit.push(pick(tops));
  } else if (bottoms.length > 0) {
    outfit.push(pick(bottoms));
  } else {
    // Fallback: just pick a random item
    outfit.push(pick(items));
  }

  if (shoes.length > 0) outfit.push(pick(shoes));
  if (outer.length > 0 && Math.random() < 0.35) outfit.push(pick(outer));
  if (accs.length > 0 && Math.random() < 0.45) outfit.push(pick(accs));

  if (outfit.length === 0) return null;

  const baseFormality = outfit[0].formality;
  const formalityLabel = FORMALITY_LABEL[baseFormality];
  const names = outfit.map((i) => i.name);

  const reasonTemplates = [
    `ลุค${formalityLabel}วันนี้ — จับคู่ ${names.join(" + ")} เข้ากันลงตัวค่ะ`,
    `เริ่มต้นด้วย${outfit[0].name} เติมส่วนอื่นให้สมดุล ลุค${formalityLabel}พร้อมออกได้เลย`,
    `${outfit[0].name} เป็นไอเท็มเด่น เสริมด้วย${outfit
      .slice(1)
      .map((i) => i.name)
      .join(" และ ")} ครบลุค${formalityLabel}`,
  ];

  return {
    userText: pick(USER_PROMPTS),
    reply: pick(REPLIES),
    suggestion: {
      name: pick(NAMES),
      itemIds: outfit.map((i) => i.id),
      reason: pick(reasonTemplates),
    },
  };
}
