import { useMemo, useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Bot,
  ChevronDown,
  Copy,
  ExternalLink,
  Heart,
  RefreshCw,
  Send,
  Sparkles,
  TableProperties,
  Trash2,
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
import {
  pendingDictionaryUpdatesStore,
  pendingRamiOrdersStore,
} from "@/services/sabanLogicService";
import {
  loadRecentStatusUpdates,
  loadScheduleOrders,
  SABAN_SHEET_TAB,
  type ScheduleOrder,
  type StatusNotificationEvent,
} from "@/services/scheduleService";
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
  const [scheduleOrders, setScheduleOrders] = useState<ScheduleOrder[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<StatusNotificationEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const configured = isGeminiConfigured();
  const { online, soundEnabled } = useSettings();
  const { position } = useGeolocation();

  // Load schedule orders and real-time status update notifications
  useEffect(() => {
    setScheduleOrders(loadScheduleOrders());
    setRecentUpdates(loadRecentStatusUpdates());

    const handleScheduleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ScheduleOrder[]>;
      if (customEvent.detail) {
        setScheduleOrders(customEvent.detail);
      } else {
        setScheduleOrders(loadScheduleOrders());
      }
    };

    const handleStatusUpdate = () => {
      setRecentUpdates(loadRecentStatusUpdates());
      setScheduleOrders(loadScheduleOrders());
    };

    window.addEventListener("saban_schedule_updated", handleScheduleUpdate);
    window.addEventListener("saban_order_status_updated", handleStatusUpdate);

    return () => {
      window.removeEventListener("saban_schedule_updated", handleScheduleUpdate);
      window.removeEventListener("saban_order_status_updated", handleStatusUpdate);
    };
  }, []);

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

  const hikmatOrdersCount = scheduleOrders.filter((o) => o.driver.includes("חכמת")).length;
  const aliOrdersCount = scheduleOrders.filter((o) => o.driver.includes("עלי")).length;
  const deliveredOrdersCount = scheduleOrders.filter((o) => o.status.includes("סופק")).length;

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
    setScheduleOrders(loadScheduleOrders());
    setRecentUpdates(loadRecentStatusUpdates());
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["records"] }),
      queryClient.invalidateQueries({ queryKey: ["queue"] }),
    ]);
    setIsRefreshing(false);
    toast("גיליון הסידור המבצעי רוענן", {
      description: `${scheduleOrders.length} הזמנות פעילות ב-${SABAN_SHEET_TAB}`,
    });
  };

  const clearChat = () => {
    setTurns([]);
    toast("השיחה אופסה");
  };

  const copyText = (text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success("הטקסט הועתק ללוח");
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

      // Re-load schedule orders and updates after streaming in case status update or append happened
      setScheduleOrders(loadScheduleOrders());
      setRecentUpdates(loadRecentStatusUpdates());

      if (soundEnabled) {
        void audioService.play("alert");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error && err.message ? err.message : "אירעה שגיאה בקבלת מענה מנועה.";
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
              aria-label="פתח בקרת סידור נועה"
              className="group relative flex items-center gap-2.5 rounded-full border border-glass-border bg-gradient-to-r from-primary to-accent p-3 text-primary-foreground shadow-xl shadow-primary/20 backdrop-blur-xl transition-all duration-300 hover:shadow-primary/40 lg:px-4 lg:py-3"
            >
              <div className="relative">
                <Sparkles className="size-5 transition-transform duration-300 group-hover:rotate-12" />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 ring-1 ring-background" />
              </div>

              <div className="hidden text-right lg:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold leading-none tracking-tight">
                    נועה AI ❤️ | מוח לוגיסטי SabanOS
                  </p>
                  {pendingDictionaryUpdatesStore.size > 0 || pendingRamiOrdersStore.size > 0 ? (
                    <span className="rounded-full bg-emerald-400/90 px-1.5 py-0.2 text-[9px] font-bold text-black animate-pulse">
                      אישור 1
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[10px] opacity-80">הצלבת קומקס · סדרנית צל · אישור 1</p>
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
            className="glass-strong fixed inset-x-3 bottom-20 z-50 flex h-[640px] max-h-[85vh] flex-col rounded-3xl border border-glass-border shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[460px]"
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
                      <h3 className="text-sm font-bold">נועה AI ❤️ | מוח לוגיסטי אוטונומי</h3>
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        SabanOS
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      יד ימינו של ראמי · קומקס ⇄ וואטסאפ ⇄ מילון סבן
                    </p>
                  </div>
                </div>

                {/* Window Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={refreshOperationalData}
                    disabled={isRefreshing}
                    title="רענן נתוני גיליון"
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

              {/* Saban Sheet Context Strip */}
              <div className="mt-3">
                <button
                  onClick={() => setShowDataDetails(!showDataDetails)}
                  className="flex w-full items-center justify-between rounded-xl border border-glass-border/60 bg-glass/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-glass hover:text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <TableProperties className="size-3.5 text-primary" />
                    <span>
                      {SABAN_SHEET_TAB} · {scheduleOrders.length} הזמנות בסידור
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="font-medium text-foreground">
                      חכמת: {hikmatOrdersCount} | עלי: {aliOrdersCount}
                    </span>
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
                          <p className="font-bold text-primary tabular-nums">
                            {scheduleOrders.length}
                          </p>
                          <p className="text-[10px] text-muted-foreground">בסידור</p>
                        </div>
                        <div className="rounded-xl bg-glass p-1.5">
                          <p className="font-bold text-sky-400 tabular-nums">{hikmatOrdersCount}</p>
                          <p className="text-[10px] text-muted-foreground">חכמת (מנוף)</p>
                        </div>
                        <div className="rounded-xl bg-glass p-1.5">
                          <p className="font-bold text-amber-400 tabular-nums">{aliOrdersCount}</p>
                          <p className="text-[10px] text-muted-foreground">עלי (איסוזו)</p>
                        </div>
                        <div className="rounded-xl bg-glass p-1.5">
                          <p className="font-bold text-success tabular-nums">
                            {deliveredOrdersCount}
                          </p>
                          <p className="text-[10px] text-muted-foreground">סופקו</p>
                        </div>
                      </div>

                      {/* Recent Toast Status Updates preview inside drawer */}
                      {recentUpdates.length > 0 ? (
                        <div className="mt-2 rounded-2xl border border-glass-border bg-glass/30 p-2.5 text-right">
                          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Bell className="size-3 text-primary" />
                              התראות סטטוס אחרונות (Toast שודר לראמי):
                            </span>
                            <span className="text-[10px] opacity-70">
                              {recentUpdates.length} עדכונים
                            </span>
                          </div>
                          <div className="max-h-28 space-y-1 overflow-y-auto pl-1 text-[11px]">
                            {recentUpdates.slice(0, 4).map((upd, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between rounded-lg bg-glass/60 px-2 py-1"
                              >
                                <div className="truncate">
                                  <span className="font-bold text-foreground">
                                    הזמנה {upd.order_id}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    ({upd.customer_name})
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                                    upd.newStatus.includes("סופק")
                                      ? "bg-success/20 text-success"
                                      : upd.newStatus.includes("יצא")
                                        ? "bg-primary/20 text-primary"
                                        : "bg-warning/20 text-warning",
                                  )}
                                >
                                  {upd.newStatus}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Status Hint Banner */}
              {!configured ? (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-warning">
                  <span>נועה פועלת במצב סידור מקומי מלא עם התראות Toast בזמן אמת.</span>
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
                      מוח לוגיסטי אוטונומי דרוך: הצלבות קומקס ⇄ וואטסאפ, איתור תוספות טלפוניות,
                      עדכון מילון משודרג, פקדונות ושיבוצי חכמת/עלי. בכל רגע תוכל לאשר בספרה{" "}
                      <strong>1</strong>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      פקודות ושאלות נפוצות:
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
                      "group relative max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap md:text-sm",
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
                        <span className="text-xs text-muted-foreground">מעבדת נתונים בגיליון…</span>
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
                      "נועה, בצעי הצלבה תלת-כיוונית להזמנת קומקס 6215715 עבור לי-רן (מוצקין 22), בדקי תוספות טלפוניות וסלנג חדש.",
                    )
                  }
                  className="shrink-0 rounded-full border border-primary/30 bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-primary/20 active:scale-95"
                >
                  🚨 הצלב קומקס (6215715)
                </button>
                <button
                  onClick={() => void send("1")}
                  className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-emerald-500/20 active:scale-95"
                  title="אישור מהיר של ראמי בספרה 1"
                >
                  1️⃣ אישור ("1")
                </button>
                <button
                  onClick={() =>
                    void send(
                      "👤 יהודה כהן (לי-רן מוצקין)\n📱 0505669924\nנועה תשלחי לי מחר בבוקר 2 בלות חול ו-40 מלט למוצקין 22 ברעננה עם חכמת.",
                    )
                  }
                  className="shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:text-primary active:scale-95"
                >
                  🔔 פנייה JONI
                </button>
                <button
                  onClick={() =>
                    void send(
                      "נועה, מה הסידור להיום בגיליון דוח_בוקר_מבצעי? תציגי חלוקה לפי סבבים ונהגים.",
                    )
                  }
                  className="shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  📋 מה הסידור?
                </button>
                <button
                  onClick={() => void send("נועה, תעדכני שהזמנה 6215504 סופקה במלואו")}
                  className="shrink-0 rounded-full border border-glass-border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-emerald-500/20 active:scale-95"
                  title="בדיקת התראת Toast לסופק במלואו"
                >
                  ✅ ספק 6215504
                </button>
                <button
                  onClick={() => void send("נועה, תעדכני שהזמנה 6215712 יצאה לדרך עם חכמת")}
                  className="shrink-0 rounded-full border border-glass-border bg-primary/10 text-primary border-primary/30 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-primary/20 active:scale-95"
                  title="בדיקת התראת Toast ליצא לדרך"
                >
                  🚚 יצא לדרך 6215712
                </button>
                <button
                  onClick={() =>
                    void send(
                      "תוסיפי לסידור של מחר סבב 1 לחכמת, הזמנה 6215715, לקוח יוסי מלכה, רחוב הזית 4 רעננה, 4 בלות חול ו-30 מלט מהחרש.",
                    )
                  }
                  className="shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground active:scale-95"
                >
                  ➕ הוסף הזמנה
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
                  placeholder="הקלד פקודה (לדוגמה: 'תעדכני שהזמנה 6215504 סופקה' או 'מה הסידור?')..."
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
 * Clean formatter for AI responses supporting bold, bullets, links and code blocks
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
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
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
  // Regex to split on bold, inline code, and links: [link](url)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);

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
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2 hover:opacity-80"
        >
          {linkMatch[1]}
          <ExternalLink className="size-2.5" />
        </a>
      );
    }
    return part;
  });
}
