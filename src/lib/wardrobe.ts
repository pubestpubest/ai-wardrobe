export type WardrobeItem = {
  id: string;
  name: string;
  category: "top" | "bottom" | "outerwear" | "shoes" | "dress" | "accessory";
  color: string;
  style: string[];
  formality: "casual" | "smart-casual" | "formal";
  emoji: string;
  imageUrl?: string;
  wearCount?: number;
  lastWorn?: string | null;
  createdAt?: string;
};

export type MatchSource = "manual" | "ai";

export type AffiliateProduct = {
  id: string;
  name: string;
  category: WardrobeItem["category"];
  color?: string;
  style: string[];
  formality: WardrobeItem["formality"];
  price: number;
  size?: string;
  store: string;
  platform: string;
  emoji: string;
  imageUrl?: string;
  description?: string;
  affiliateUrl: string;
};

export type Match = {
  id: string;
  name: string;
  itemIds: string[];
  affiliateProductIds: string[];
  occasion?: string;
  note?: string;
  reason?: string;
  source: MatchSource;
  createdAt: string;
};

export type MatchSuggestion = {
  name: string;
  itemIds: string[];
  occasion?: string;
  reason: string;
};

export type WardrobeMode = "empty" | "incomplete" | "complete";

export function wardrobeMode(items: Pick<WardrobeItem, "category">[]): WardrobeMode {
  if (items.length === 0) return "empty";
  const has = (c: WardrobeItem["category"]) => items.some((i) => i.category === c);
  const complete = ((has("top") && has("bottom")) || has("dress")) && has("shoes");
  return complete ? "complete" : "incomplete";
}

export const CATEGORY_LABELS: Record<WardrobeItem["category"], string> = {
  top: "เสื้อ",
  bottom: "กางเกง/กระโปรง",
  outerwear: "เสื้อคลุม",
  shoes: "รองเท้า",
  dress: "เดรส",
  accessory: "อุปกรณ์",
};

export const FORMALITY_LABELS: Record<WardrobeItem["formality"], string> = {
  casual: "ลำลอง",
  "smart-casual": "สมาร์ทแคชชวล",
  formal: "ทางการ",
};

export const SEED_ITEMS: WardrobeItem[] = [
  {
    id: "s1",
    name: "เสื้อเชิ้ตขาว",
    category: "top",
    color: "ขาว",
    style: ["minimal", "classic"],
    formality: "formal",
    emoji: "👔",
  },
  {
    id: "s2",
    name: "เสื้อยืดสีพาสเทลม่วง",
    category: "top",
    color: "ม่วงพาสเทล",
    style: ["casual", "cute"],
    formality: "casual",
    emoji: "👚",
  },
  {
    id: "s3",
    name: "เสื้อสเวตเตอร์สีชมพู",
    category: "top",
    color: "ชมพู",
    style: ["cozy", "cute"],
    formality: "casual",
    emoji: "🧥",
  },
  {
    id: "s4",
    name: "เบลเซอร์สีฟ้าอ่อน",
    category: "outerwear",
    color: "ฟ้าอ่อน",
    style: ["smart", "modern"],
    formality: "smart-casual",
    emoji: "🧥",
  },
  {
    id: "s5",
    name: "กางเกงยีนส์สีน้ำเงิน",
    category: "bottom",
    color: "น้ำเงิน",
    style: ["casual"],
    formality: "casual",
    emoji: "👖",
  },
  {
    id: "s6",
    name: "กางเกงสแล็คสีดำ",
    category: "bottom",
    color: "ดำ",
    style: ["formal", "classic"],
    formality: "formal",
    emoji: "👖",
  },
  {
    id: "s7",
    name: "กระโปรงพลีทสีครีม",
    category: "bottom",
    color: "ครีม",
    style: ["feminine"],
    formality: "smart-casual",
    emoji: "👗",
  },
  {
    id: "s8",
    name: "เดรสลายดอกพาสเทล",
    category: "dress",
    color: "พาสเทล",
    style: ["feminine", "cute"],
    formality: "smart-casual",
    emoji: "👗",
  },
  {
    id: "s9",
    name: "รองเท้าผ้าใบขาว",
    category: "shoes",
    color: "ขาว",
    style: ["casual", "minimal"],
    formality: "casual",
    emoji: "👟",
  },
  {
    id: "s10",
    name: "รองเท้าส้นสูงสีนู้ด",
    category: "shoes",
    color: "นู้ด",
    style: ["elegant"],
    formality: "formal",
    emoji: "👠",
  },
  {
    id: "s11",
    name: "กระเป๋าสะพายสีชมพู",
    category: "accessory",
    color: "ชมพู",
    style: ["cute"],
    formality: "smart-casual",
    emoji: "👜",
  },
  {
    id: "s12",
    name: "แว่นกันแดด",
    category: "accessory",
    color: "ดำ",
    style: ["chic"],
    formality: "casual",
    emoji: "🕶️",
  },
];
