import { useEffect, useState } from "react";
import type { WardrobeItem } from "@/lib/wardrobe";
import { WARDROBE as SEED } from "@/lib/wardrobe";

const KEY = "wardrobe-v1";

export type StoredItem = WardrobeItem & { imageUrl?: string };

function read(): StoredItem[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return SEED;
    return JSON.parse(raw) as StoredItem[];
  } catch {
    return SEED;
  }
}

export function useWardrobe() {
  const [items, setItems] = useState<StoredItem[]>(SEED);

  useEffect(() => {
    setItems(read());
  }, []);

  function persist(next: StoredItem[]) {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota — ignore */
    }
  }

  return {
    items,
    add: (item: StoredItem) => persist([item, ...items]),
    remove: (id: string) => persist(items.filter((i) => i.id !== id)),
    reset: () => persist(SEED),
  };
}
