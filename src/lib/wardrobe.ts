export type WardrobeItem = {
  id: string;
  name: string;
  category: "top" | "bottom" | "outerwear" | "shoes" | "dress" | "accessory";
  color: string;
  style: string[];
  formality: "casual" | "smart-casual" | "formal";
  emoji: string;
};

export const WARDROBE: WardrobeItem[] = [
  { id: "1", name: "เสื้อเชิ้ตขาว", category: "top", color: "ขาว", style: ["minimal", "classic"], formality: "formal", emoji: "👔" },
  { id: "2", name: "เสื้อยืดสีพาสเทลม่วง", category: "top", color: "ม่วงพาสเทล", style: ["casual", "cute"], formality: "casual", emoji: "👚" },
  { id: "3", name: "เสื้อสเวตเตอร์สีชมพู", category: "top", color: "ชมพู", style: ["cozy", "cute"], formality: "casual", emoji: "🧥" },
  { id: "4", name: "เบลเซอร์สีฟ้าอ่อน", category: "outerwear", color: "ฟ้าอ่อน", style: ["smart", "modern"], formality: "smart-casual", emoji: "🧥" },
  { id: "5", name: "กางเกงยีนส์สีน้ำเงิน", category: "bottom", color: "น้ำเงิน", style: ["casual"], formality: "casual", emoji: "👖" },
  { id: "6", name: "กางเกงสแล็คสีดำ", category: "bottom", color: "ดำ", style: ["formal", "classic"], formality: "formal", emoji: "👖" },
  { id: "7", name: "กระโปรงพลีทสีครีม", category: "bottom", color: "ครีม", style: ["feminine"], formality: "smart-casual", emoji: "👗" },
  { id: "8", name: "เดรสลายดอกพาสเทล", category: "dress", color: "พาสเทล", style: ["feminine", "cute"], formality: "smart-casual", emoji: "👗" },
  { id: "9", name: "รองเท้าผ้าใบขาว", category: "shoes", color: "ขาว", style: ["casual", "minimal"], formality: "casual", emoji: "👟" },
  { id: "10", name: "รองเท้าส้นสูงสีนู้ด", category: "shoes", color: "นู้ด", style: ["elegant"], formality: "formal", emoji: "👠" },
  { id: "11", name: "กระเป๋าสะพายสีชมพู", category: "accessory", color: "ชมพู", style: ["cute"], formality: "smart-casual", emoji: "👜" },
  { id: "12", name: "แว่นกันแดด", category: "accessory", color: "ดำ", style: ["chic"], formality: "casual", emoji: "🕶️" },
];
