export type WardrobeItem = {
  id: string;
  name: string;
  category: "top" | "bottom" | "outerwear" | "shoes" | "dress" | "accessory";
  color: string;
  style: string[];
  tags?: string[];
  formality: "casual" | "smart-casual" | "formal";
  emoji: string;
  imageUrl?: string;
  wearCount?: number;
  lastWorn?: string | null;
  createdAt?: string;
};

export const ITEM_TAGS = [
  "ทำงาน",
  "ลำลอง",
  "ออกเดท",
  "งานทางการ",
  "เที่ยว",
  "ออกกำลังกาย",
] as const;

// Pastel chip background per tag (used for the tag chips shown over item images).
export const TAG_COLORS: Record<string, string> = {
  ทำงาน: "bg-[#cce2fc]/90", // blue
  ลำลอง: "bg-[#cdebd6]/90", // green
  ออกเดท: "bg-[#fccce2]/90", // pink
  งานทางการ: "bg-[#d8d2fb]/90", // lilac
  เที่ยว: "bg-[#ffe0c2]/90", // peach
  ออกกำลังกาย: "bg-[#f4e6a8]/90", // yellow
};

// Daily per-user AI call limits — mirrored by the server quota checks and shown in the UI.
export const AI_LIMITS = { chat: 30, analyze: 20 } as const;

// Store package limits — code, not DB, so tuning a tier is a one-line edit
// rather than a migration plus a data update. `weight` biases the AI
// recommendation lottery and Discover card ordering toward higher tiers.
export const STORE_PACKAGES = {
  free: { label: "ฟรี", maxItems: 10, weight: 1 },
  basic: { label: "เบสิก", maxItems: 50, weight: 3 },
  premium: { label: "พรีเมียม", maxItems: 200, weight: 8 },
} as const;
export type StorePackage = keyof typeof STORE_PACKAGES;

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
  // Optional since 018: a local store's items have no marketplace listing —
  // see LOCAL-STORE.md §1. Stays required in the admin-editor's own type
  // (NewAffiliateProduct, use-affiliate-products.ts) since that path still
  // lists marketplace products.
  store?: string;
  platform?: string;
  emoji: string;
  imageUrl?: string;
  description?: string;
  affiliateUrl?: string;
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

export type OutfitWear = {
  id: string;
  // null once the match is deleted — the FK is `on delete set null`, so the day
  // keeps its "you wore something" record without pointing at a match.
  matchId: string | null;
  wornDate: string;
};

// The one place a calendar date key is computed. The calendar renders in local
// time, so a UTC-derived key lands on the wrong cell near midnight (the bug
// B05-L1's scrutinize caught). Hook, calendar and toggle all call this.
export function localDateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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
