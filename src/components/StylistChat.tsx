import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { matchChat } from "@/lib/match-chat.functions";
import { useMatches } from "@/hooks/use-matches";
import { SuggestionCard } from "@/components/SuggestionCard";
import type { StoredItem } from "@/hooks/use-wardrobe";
import type { MatchSuggestion } from "@/lib/wardrobe";

type Msg = {
  role: "user" | "assistant";
  content: string;
  suggestion?: MatchSuggestion;
  dismissed?: boolean;
};

const SUGGESTIONS = [
  "ไปงานแต่งงานช่วงบ่าย ใส่อะไรดี",
  "ทำงานวันจันทร์ สไตล์มินิมอล",
  "เดทค่ำคืน อากาศเย็น",
  "เที่ยวคาเฟ่วันหยุด",
];

export function StylistChat({ wardrobe, env }: { wardrobe: StoredItem[]; env?: string }) {
  const chat = useServerFn(matchChat);
  const { add: addMatch } = useMatches();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "สวัสดีค่ะ ✨ ฉันเป็น AI Stylist ส่วนตัวของคุณ\nบอกฉันได้เลยว่าวันนี้จะไปไหน อากาศเป็นยังไง หรือสไตล์ที่อยากได้ แล้วฉันจะจัดชุดให้จากตู้เสื้อผ้าของคุณค่ะ",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const wardrobePayload = wardrobe.map(({ imageUrl: _img, ...rest }) => rest);
      const wardrobeStr = JSON.stringify(wardrobePayload);
      const wardrobeIds = wardrobe.map((w) => w.id);
      const { reply, suggestion } = await chat({
        data: {
          messages: next.map(({ role, content }) => ({ role, content })),
          wardrobe: wardrobeStr,
          wardrobeIds,
          env: env as "dev" | "uat" | "prod" | undefined,
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: reply, suggestion }]);
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

  async function saveSuggestion(s: MatchSuggestion) {
    await addMatch({
      name: s.name,
      itemIds: s.itemIds,
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
        <div>
          <p className="text-sm font-semibold">AI Stylist</p>
          <p className="text-xs text-muted-foreground">แชทเพื่อรับชุดแนะนำ</p>
        </div>
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
                onSave={saveSuggestion}
                onDismiss={() => dismissSuggestion(i)}
              />
            )}
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
    </div>
  );
}
