import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Heart,
  Layers,
  MapPin,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  isGeminiConfigured,
  NOA_OPERATIONAL_SUGGESTIONS,
  streamReply,
  type ChatTurn,
  type OperationalDataSnapshot,
} from "@/services/geminiService";
import { fetchRecords } from "@/services/sheetsService";
import { readAll, type PendingAction } from "@/lib/storage";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSettings } from "@/lib/settings";
import { audioService } from "@/services/audioService";
import { cn } from "@/lib/utils";

export function GeminiAssistant() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const configured = isGeminiConfigured();
  const { online, soundEnabled } = useSettings();
  const { position } = useGeolocation();

  // Real operational queries
  const recordsQuery = useQuery({ queryKey: ["records"], queryFn: fetchRecords });
  const queueQuery = useQuery({
    queryKey: ["queue"],
    queryFn: () => readAll<PendingAction>("queue"),
  });

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data]);
  const queue = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);

  const syncedCount = records.filter((r) => r.status === "synced").length;
  const pendingCount = records.filter((r) => r.status === "pending").length;
  const failedCount = records.filter((r) => r.status === "failed").length;

  const dataSnapshot: OperationalDataSnapshot = useMemo(
    () => ({
      recordsCount: records.length,
      syncedCount,
      pendingCount,
      failedCount,
      queueCount: queue.length,
      online,
      records: records.map((r) => ({
        id: r.id,
        title: r.title,
        interfaceName: r.interfaceName,
        driveFolderReference: r.driveFolderReference,
        sheetRowId: r.sheetRowId,
        status: r.status,
        timestamp: r.timestamp,
        note: r.note,
      })),
      queue: queue.map((q) => ({
        id: q.id,
        type: q.type,
        recordId: q.recordId,
        createdAt: q.createdAt,
      })),
      gps: position,
    }),
    [records, syncedCount, pendingCount, failedCount, queue, online, position],
  );

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, minimized]);

  const refreshOperationalData = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["records"] }),
      queryClient.invalidateQueries({ queryKey: ["queue"] }),
    ]);
    setIsRefreshing(false);
    toast("נתוני המערכת רועננו בהצלחה", {
      description: `${records.length} רשומות מקושרות כעת לעוזר ה-AI`,
    });
  };

  const clearChat = () => {
    setTurns([]);
    toast("השיחה אופסה");
  };

  const copyText = (text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success("התשובה הועתקה ללוח");
  };

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || thinking) return;

    const userTurn: ChatTurn = { role: "user", text: prompt, timestamp: Date.now() };
    const history: ChatTurn[] = [...turns, userTurn];
    setTurns([...history, { role: "model", text: "", timestamp: Date.now() }]);
    setInput("");
    setThinking(true);

    try {
      for await (const chunk of streamReply(history, dataSnapshot)) {
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "model") {
            next[next.length - 1] = {
              role: "model",
              text: last.text + chunk,
              timestamp: last.timestamp,
            };
          }
          return next;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }

      if (soundEnabled) {
        void audioService.play("alert");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && err.message
          ? err.message
          : "אירעה שגיאה בקבלת תשובה מ-Google AI Studio.";
      setTurns((prev) => [
        ...prev.slice(0, -1),
        { role: "model", text: errorMsg, timestamp: Date.now() },
      ]);
    } finally {
      setThinking(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!open || minimized ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-20 left-4 z-40 lg:bottom-6 lg:left-6"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setOpen(true);
                setMinimized(false);
              }}
              aria-label="פתח בקרת תעודות נועה"
              className="group relative flex items-center gap-2.5 rounded-full border border-glass-border bg-gradient-to-r from-primary to-accent p-3 text-primary-foreground shadow-xl shadow-primary/20 backdrop-blur-xl transition-all duration-300 hover:shadow-primary/40 lg:px-4 lg:py-3"
            >
              <div className="relative">
                <Sparkles className="size-5 transition-transform duration-300 group-hover:rotate-12" />
                {failedCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 flex size-3 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white ring-2 ring-background">
                    {failedCount}
                  </span>
                ) : (
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-1 ring-background" />
                )}
              </div>

              <div className="hidden text-right lg:block">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold leading-none tracking-tight">
                    נועה ❤️ | בקרת תעודות
                  </p>
                </div>
                <p className="mt-0.5 text-[10px] opacity-80">{records.length} מסמכים לבקרה</p>
              </div>
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Floating Chat Modal Card */}
      <AnimatePresence>
        {open && !minimized ? (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="glass-strong fixed inset-x-3 bottom-20 z-50 flex h-[620px] max-h-[85vh] flex-col rounded-3xl border border-glass-border shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[450px]"
          >
            {/* Header */}
            <div className="border-b border-glass-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
                    <Bot className="size-5" />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background",
                        configured ? "bg-emerald-400" : "bg-amber-400",
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold">נועה ❤️ | בקרת תעודות והצלבות</h3>
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        סבן 1994
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      יד ימינו של ראמי ·{" "}
                      {configured ? "Google AI Studio ישיר" : "בקרת הצלבות מקומית"}
                    </p>
                  </div>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={refreshOperationalData}
                    disabled={isRefreshing}
                    title="רענן נתוני מערכת"
                    className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-glass hover:text-foreground active:scale-95"
                  >
                    <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
                  </button>
                  <button
                    onClick={clearChat}
                    title="נקה שיחה"
                    className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-glass hover:text-foreground active:scale-95"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setMinimized(true)}
                    title="מזער"
                    className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-glass hover:text-foreground active:scale-95"
                  >
                    <span className="h-0.5 w-3 rounded-full bg-current" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    title="סגור"
                    className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-glass hover:text-foreground active:scale-95"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Operational Context Strip */}
              <div className="mt-3">
                <button
                  onClick={() => setShowDataDetails(!showDataDetails)}
                  className="flex w-full items-center justify-between rounded-xl border border-glass-border/60 bg-glass/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-glass hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Database className="size-3.5 text-primary" />
                    <span>
                      {records.length} רשומות ·{" "}
                      {failedCount > 0 ? `${failedCount} כשלים` : "הכל מסונכרן"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>{online ? "מקוון" : "אופליין"}</span>
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform duration-200",
                        showDataDetails && "rotate-180",
                      )}
                    />
                  </div>
                </button>

                {/* Expandable Data Stats Drawer */}
                <AnimatePresence>
                  {showDataDetails ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-2xl border border-glass-border bg-glass/40 p-2 text-center text-[11px]">
                        <div className="rounded-xl bg-glass p-1.5">
                          <p className="font-bold text-success tabular-nums">{syncedCount}</p>
                          <p className="text-[10px] text-muted-foreground">מסונכרן</p>
                        </div>
                        <div className="rounded-xl bg-glass p-1.5">
                          <p className="font-bold text-warning tabular-nums">{pendingCount}</p>
                          <p className="text-[10px] text-muted-foreground">ממתין</p>
                        </div>
                        <div className="rounded-xl bg-glass p-1.5">
                          <p className="font-bold text-destructive tabular-nums">{failedCount}</p>
                          <p className="text-[10px] text-muted-foreground">כשלים</p>
                        </div>
                        <div className="rounded-xl bg-glass p-1.5">
                          <p className="font-bold text-primary tabular-nums">{queue.length}</p>
                          <p className="text-[10px] text-muted-foreground">בתור</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Vercel API Key Setup Hint Banner (Quiet notice when unconfigured) */}
              {!configured ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-warning">
                  <span>להפעלת בינה חופשית, הגדר VITE_GEMINI_API_KEY ב-Vercel</span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                  >
                    מפתח <ExternalLink className="size-2.5" />
                  </a>
                </div>
              ) : null}
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3.5 overflow-y-auto p-4 text-sm leading-relaxed"
            >
              {turns.length === 0 ? (
                <div className="space-y-4 py-2">
                  <div className="rounded-2xl border border-glass-border bg-glass/60 p-4 text-center">
                    <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-sm">
                      <Heart className="size-5 fill-current" />
                    </div>
                    <p className="font-bold text-foreground">שלום ראמי! נועה לשירותך ❤️</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      אני כאן לעבור איתך על תעודות המשלוח, לבצע הצלבות מול ההזמנות, לבדוק פקדונות
                      (בלה 60002 ומשטחים 60060), לאמת טכוגרף ולהפיק המלצות אישור מדויקות.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      פעולות בקרה והצלבה מהירות:
                    </p>
                    <div className="grid gap-1.5">
                      {NOA_OPERATIONAL_SUGGESTIONS.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => void send(item.prompt)}
                          className="flex items-center gap-2.5 rounded-2xl border border-glass-border bg-glass/70 p-2.5 text-right text-xs transition-colors hover:border-primary/40 hover:bg-glass"
                        >
                          <span className="text-sm">{item.icon}</span>
                          <span className="font-medium text-foreground">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {turns.map((turn, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-1",
                    turn.role === "user" ? "items-start" : "items-end",
                  )}
                >
                  <div
                    className={cn(
                      "group relative max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap md:text-sm",
                      turn.role === "user"
                        ? "ms-auto bg-primary text-primary-foreground shadow-sm"
                        : "border border-glass-border bg-glass/80 text-foreground backdrop-blur-md",
                    )}
                  >
                    {turn.text ? (
                      <FormattedMessage content={turn.text} />
                    ) : (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                        <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:200ms]" />
                        <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:400ms]" />
                        <span className="text-xs text-muted-foreground">מעבד תובנות…</span>
                      </div>
                    )}

                    {turn.role === "model" && turn.text ? (
                      <button
                        onClick={() => copyText(turn.text)}
                        title="העתק תשובה"
                        className="absolute top-2 left-2 rounded-lg bg-glass/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                      >
                        <Copy className="size-3" />
                      </button>
                    ) : null}
                  </div>

                  <span className="px-2 text-[10px] text-muted-foreground">
                    {turn.timestamp
                      ? new Date(turn.timestamp).toLocaleTimeString("he-IL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions Footer Strip */}
            <div className="border-t border-glass-border/70 bg-glass/30 p-3">
              <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() =>
                    void send(
                      "נועה, בצעי הצלבה מלאה של תעודת המשלוח האחרונה מול ההזמנה, כולל חתימה ופקדונות.",
                    )
                  }
                  className="shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  📄 הצלב תעודה
                </button>
                <button
                  onClick={() =>
                    void send(
                      'בדקי תקינות פקדונות: בלה (60002 יחס 1:1 למק"טים 11501-11570) ומשטחי 60060 לפי 35-40 שקים.',
                    )
                  }
                  className="shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  📦 בדוק פקדונות
                </button>
                <button
                  onClick={() =>
                    void send("בדקי רציפות נסיעת נהג, שעות פעילות וזמני פריקה באתר לפי הטכוגרף.")
                  }
                  className="shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  ⏱️ טכוגרף וזמנים
                </button>
                <button
                  onClick={() =>
                    void send(
                      "הפיקי דוח יומי מסכם לראמי: כמה תעודות נסרקו, כמה אושרו, כמה הועברו לבדיקה וכמה נפסלו.",
                    )
                  }
                  className="shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  📊 סיכום לראמי
                </button>
              </div>

              {/* Input Form */}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(input);
                }}
                className="flex items-center gap-2"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  placeholder="הקלד מספר תעודה, שם לקוח, שאילתת פקדונות או בקש הצלבה…"
                  className="max-h-24 min-h-[44px] flex-1 resize-none rounded-2xl border border-glass-border bg-glass px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40 md:text-sm"
                />
                <button
                  type="submit"
                  disabled={thinking || !input.trim()}
                  aria-label="שלח הודעה"
                  className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform active:scale-90 disabled:opacity-50"
                >
                  <Send className="size-4 rtl:-scale-x-100" />
                </button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

/**
 * Clean formatter for AI responses supporting bold, bullets and code blocks
 */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-1.5" />;
        }

        // Bullet point
        if (line.trim().startsWith("•") || line.trim().startsWith("-")) {
          const text = line.replace(/^[•-]\s*/, "");
          return (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-1 size-1 shrink-0 rounded-full bg-primary" />
              <span>{renderFormattedInline(text)}</span>
            </div>
          );
        }

        return <p key={idx}>{renderFormattedInline(line)}</p>;
      })}
    </div>
  );
}

function renderFormattedInline(text: string) {
  // Simple markdown bold and inline code parser
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded border border-glass-border bg-black/10 px-1 py-0.5 font-mono text-[11px] text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
