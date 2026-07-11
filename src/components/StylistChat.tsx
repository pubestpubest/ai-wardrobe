import { useState, useRef, useEffect, useImperativeHandle } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import { matchChat } from "@/lib/match-chat.functions";
import { useMatches } from "@/hooks/use-matches";
import { SuggestionCard } from "@/components/SuggestionCard";
import { AffiliateItemCard } from "@/components/AffiliateItemCard";
import { AffiliateItemModal } from "@/components/AffiliateItemModal";
import { wardrobeMode } from "@/lib/wardrobe";
import type { StoredItem } from "@/hooks/use-wardrobe";
import type { AffiliateProduct, MatchSuggestion } from "@/lib/wardrobe";
import type { DailyPick } from "@/lib/daily-pick";

export type StylistChatHandle = {
  injectDaily: (pick: DailyPick) => void;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  suggestion?: MatchSuggestion;
  affiliateItems?: AffiliateProduct[];
  dismissed?: boolean;
};

const SUGGESTIONS = [
  "ไปงานแต่งงานช่วงบ่าย ใส่อะไรดี",
  "ทำงานวันจันทร์ สไตล์มินิมอล",
  "เดทค่ำคืน อากาศเย็น",
  "เที่ยวคาเฟ่วันหยุด",
];

const CHAT_STORAGE_KEY = "wardrobe.chat";
const AFFILIATE_TURNS_KEY = "wardrobe.affiliateTurns";

function readAffiliateTurns(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(AFFILIATE_TURNS_KEY));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function writeAffiliateTurns(n: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AFFILIATE_TURNS_KEY, String(n));
  } catch {
    // storage full / disabled — silently skip
  }
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "สวัสดีค่ะ ✨ ฉันเป็น AI Stylist ส่วนตัวของคุณ\nบอกฉันได้เลยว่าวันนี้จะไปไหน อากาศเป็นยังไง หรือสไตล์ที่อยากได้ แล้วฉันจะจัดชุดให้จากตู้เสื้อผ้าของคุณค่ะ",
};

function loadMessages(): Msg[] {
  if (typeof window === "undefined") return [GREETING];
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [GREETING];
    const parsed = JSON.parse(raw) as Msg[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [GREETING];
  } catch {
    return [GREETING];
  }
}

export function StylistChat({
  ref,
  wardrobe,
  env,
}: {
  ref?: React.Ref<StylistChatHandle>;
  wardrobe: StoredItem[];
  env?: string;
}) {
  const chat = useServerFn(matchChat);
  const { add: addMatch } = useMatches();
  const [messages, setMessages] = useState<Msg[]>(() => loadMessages());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingAffiliate, setViewingAffiliate] = useState<AffiliateProduct | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      injectDaily: (p: DailyPick) => {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: p.userText },
          { role: "assistant", content: p.reply, suggestion: p.suggestion },
        ]);
      },
    }),
    [],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage full / disabled — silently skip
    }
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setLoading(true);
    try {
      const wardrobePayload = wardrobe.map(({ imageUrl: _img, ...rest }) => rest);
      const wardrobeStr = JSON.stringify(wardrobePayload);
      const wardrobeIds = wardrobe.map((w) => w.id);
      const mode = wardrobeMode(wardrobe);
      const turnsSinceRec = readAffiliateTurns();
      // 3rd bare turn triggers a forced rec once the wardrobe is complete.
      const forceAffiliate = mode === "complete" && turnsSinceRec >= 2;
      // One-shot: send only the current user prompt, no prior history (saves tokens).
      const { reply, suggestion, affiliateItems } = await chat({
        data: {
          messages: [{ role: "user", content }],
          wardrobe: wardrobeStr,
          wardrobeIds,
          env: env as "dev" | "uat" | "prod" | undefined,
          mode,
          forceAffiliate,
        },
      });
      const gotRec = (affiliateItems?.length ?? 0) > 0;
      // Only the "complete" mode uses the counter to force a rec; reset it in
      // other modes so it can't grow unbounded between complete-mode sessions.
      writeAffiliateTurns(mode !== "complete" ? 0 : gotRec ? 0 : turnsSinceRec + 1);
      setMessages((m) => [...m, { role: "assistant", content: reply, suggestion, affiliateItems }]);
    } catch (_err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `ขออภัยค่ะ เกิดข้อผิดพลาด: ขณะนี้ระบบมีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้งภายหลัง`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([GREETING]);
    writeAffiliateTurns(0);
    toast.success("เคลียร์แชทแล้ว");
  }

  async function saveSuggestion(s: MatchSuggestion, affiliateItems?: AffiliateProduct[]) {
    await addMatch({
      name: s.name,
      itemIds: s.itemIds,
      affiliateProductIds: affiliateItems?.map((p) => p.id) ?? [],
      occasion: s.occasion,
      reason: s.reason,
      source: "ai",
    });
    toast.success("บันทึกแมตช์เข้าโปรดแล้ว");
  }

  function dismissSuggestion(index: number) {
    setMessages((m) => m.map((msg, i) => (i === index ? { ...msg, dismissed: true } : msg)));
  }

  return (
    <div className="pastel-card glass flex flex-col gap-4 min-h-[520px]">
      <div className="flex items-center gap-2">
        <div className="size-9 rounded-full bg-lilac flex items-center justify-center">
          <Sparkles className="size-4 text-lilac-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">AI Stylist</p>
          <p className="text-xs text-muted-foreground">แชทเพื่อรับชุดแนะนำ</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            className="size-8 rounded-full bg-muted text-muted-foreground hover:bg-border flex items-center justify-center transition"
            aria-label="เคลียร์แชท"
            title="เคลียร์แชท"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto max-h-[380px] flex flex-col gap-3 pr-1"
      >
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-2">
            {m.content && (
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "self-end bg-sky text-sky-foreground"
                    : "self-start bg-blush text-blush-foreground"
                }`}
              >
                {m.content}
              </div>
            )}
            {m.suggestion && !m.dismissed && (
              <SuggestionCard
                suggestion={m.suggestion}
                items={wardrobe}
                onSave={(s) => saveSuggestion(s, m.affiliateItems)}
                onDismiss={() => dismissSuggestion(i)}
              />
            )}
            {!m.dismissed &&
              m.affiliateItems?.map((product) => (
                <AffiliateItemCard
                  key={product.id}
                  item={product}
                  onView={() => setViewingAffiliate(product)}
                />
              ))}
          </div>
        ))}
        {loading && (
          <div className="self-start bg-blush text-blush-foreground rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs">กำลังจัดชุดให้...</span>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-lilac/60 text-lilac-foreground hover:bg-lilac transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 bg-white/80 rounded-full pl-4 pr-1.5 py-1.5 border border-border"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="พิมพ์โอกาส สภาพอากาศ หรือสไตล์ที่อยากได้..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition"
        >
          <Send className="size-4" />
        </button>
      </form>

      <AffiliateItemModal item={viewingAffiliate} onClose={() => setViewingAffiliate(null)} />
    </div>
  );
}
