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

// Deterministic PRNG (mulberry32) so the SAME seed always produces the SAME
// sequence. No Math.random() call lives inside weightedShuffle/weightedPick
// themselves — the caller supplies rand — which is what lets a caller like
// discover.tsx hold an order stable across re-renders (memoized on a
// useState seed fixed at mount), and lets scripts/check-weighting.ts drive
// thousands of draws deterministically instead of depending on real
// randomness to eventually converge.
// Moved here from discover.tsx (B15-L1) so Discover's card order and the AI
// recommendation pool share one weighting rule instead of two copies that
// can drift on what a package tier is worth.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weighted-random ordering (Efraimidis-Spirakis A-ExpJ): draw
// key = rand() ** (1/weight) per item, sort descending by key. Higher weight
// biases toward the front without being a strict sort — a free store can
// still land near the top, same lottery shape as the AI recommendation pick
// (LOCAL-STORE.md §4).
export function weightedShuffle<T>(items: T[], weightFn: (item: T) => number, seed: number): T[] {
  const rand = mulberry32(Math.floor(seed * 0xffffffff));
  return items
    .map((item) => ({ item, key: Math.pow(rand(), 1 / Math.max(weightFn(item), 0.0001)) }))
    .sort((a, b) => b.key - a.key)
    .map(({ item }) => item);
}

// Weighted single selection — the AI recommendation store pick (B15-L1,
// LOCAL-STORE.md §4). `rand` is injected (never Math.random() internally) so
// callers can drive it deterministically, e.g. scripts/check-weighting.ts
// running thousands of seeded draws to verify the distribution instead of
// eyeballing production traffic.
//
// Edge cases: empty input -> null; a single item -> that item regardless of
// its weight; all-equal weights -> uniform (falls out of the standard
// cumulative-weight draw below); a zero or negative weight is clamped to 0
// so it can never win on a positive draw and never produces a
// negative-probability slice.
/**
 * Two-step weighted selection: choose a GROUP weighted by `weightOfGroup`, then
 * one member uniformly within it. This is THE weighting rule (LOCAL-STORE.md
 * §4) — exported as a whole, not just as `weightedPick`, so `findAffiliateProduct`
 * and `scripts/check-weighting.ts` exercise the same code. A check that
 * reimplements the composition can't catch a revert in the composition, which is
 * the only regression worth catching here.
 *
 * Why two-step rather than weighting each item: the two package levers multiply.
 * A premium store holds up to 20x more rows (200 vs 10) and each row would be 8x
 * likelier — ~160x exposure, the hard-filter outcome by accident. This pins the
 * ratio at the package weight regardless of catalog size.
 */
export function weightedPickByGroup<T>(
  items: T[],
  groupOf: (item: T) => string,
  weightOfGroup: (group: string) => number,
  rand: () => number,
): T | null {
  if (items.length === 0) return null;
  const byGroup = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const list = byGroup.get(key) ?? [];
    list.push(item);
    byGroup.set(key, list);
  }
  const group = weightedPick([...byGroup.keys()], weightOfGroup, rand);
  if (group === null) return null;
  return weightedPick(byGroup.get(group) ?? [], () => 1, rand);
}

export function weightedPick<T>(
  items: T[],
  weightFn: (item: T) => number,
  rand: () => number,
): T | null {
  if (items.length === 0) return null;
  const weights = items.map((item) => Math.max(weightFn(item), 0));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    // Every weight clamped to 0 (or the pool is otherwise degenerate) — fall
    // back to uniform rather than returning null, so a single item (however
    // it's weighted) still always resolves.
    return items[Math.floor(rand() * items.length)];
  }
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1]; // float rounding safety net
}

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
  // Which local store (public.stores) this item belongs to — undefined for a
  // marketplace row with no store, same `?? undefined` convention as the
  // fields above. Populated on the admin-editor path (B14a) so
  // AffiliateEditModal's store dropdown can show the current assignment
  // instead of always defaulting to "no store" and silently clearing it on
  // every save (the "cleared field silently doesn't save" bug class,
  // B13b-L1 — here it's the mirror image: an unseen field silently DOES
  // "save" over the real value unless the read path returns it).
  storeId?: string;
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
