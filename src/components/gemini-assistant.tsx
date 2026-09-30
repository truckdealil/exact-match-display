import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import {
  QUICK_PROMPTS,
  isGeminiConfigured,
  streamReply,
  type ChatTurn,
} from "@/services/geminiService";
import { cn } from "@/lib/utils";

export function GeminiAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || thinking) return;
    const history: ChatTurn[] = [...turns, { role: "user", text: prompt }];
    setTurns([...history, { role: "model", text: "" }]);
    setInput("");
    setThinking(true);

    try {
      for await (const chunk of streamReply(history)) {
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "model")
            next[next.length - 1] = { role: "model", text: last.text + chunk };
          return next;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch {
      setTurns((prev) => [
        ...prev.slice(0, -1),
        { role: "model", text: "אירעה שגיאה בחיבור למנוע ה-AI." },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        aria-label="עוזר AI"
        className="glow-ring fixed bottom-24 left-4 z-40 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground lg:bottom-8 lg:left-8"
      >
        <Sparkles className="size-6" />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-start bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              onClick={(event) => event.stopPropagation()}
              className="glass-strong flex h-full w-full max-w-md flex-col rounded-l-3xl p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-accent/15 text-accent">
                    <Sparkles className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">עוזר Gemini</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isGeminiConfigured()
                        ? "מחובר ל-Google AI Studio"
                        : "מצב הדגמה — ממתין למפתח API"}
                    </p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="סגור">
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>

              <div ref={scrollRef} className="mt-5 flex-1 space-y-3 overflow-y-auto pl-1">
                {turns.length === 0 ? (
                  <p className="rounded-2xl border border-glass-border bg-glass p-4 text-sm text-muted-foreground">
                    שאל כל שאלה על הנתונים, הסנכרון או הפעילות במערכת.
                  </p>
                ) : null}
                {turns.map((turn, index) => (
                  <div
                    key={index}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                      turn.role === "user"
                        ? "ms-auto bg-primary/20 ring-1 ring-primary/30"
                        : "border border-glass-border bg-glass",
                    )}
                  >
                    {turn.text ? (
                      turn.text
                    ) : (
                      <span className="block h-3 w-32 rounded-full shimmer-line" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void send(prompt)}
                    className="rounded-full border border-glass-border bg-glass px-3 py-1.5 text-xs transition-transform active:scale-95"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(input);
                }}
                className="mt-3 flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="כתוב הודעה…"
                  className="h-12 flex-1 rounded-2xl border border-glass-border bg-glass px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="submit"
                  disabled={thinking}
                  aria-label="שלח"
                  className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground transition-transform active:scale-90 disabled:opacity-50"
                >
                  <Send className="size-4 rtl:-scale-x-100" />
                </button>
              </form>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
