import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Cloud,
  Cpu,
  FolderSync,
  Gauge,
  History,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Trash2,
  TriangleAlert,
  Truck,
  User,
  Users,
  Volume2,
} from "lucide-react";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  checkSheetsCloudConnection,
  clearAllRecords,
  fetchRecords,
  purgeMockRecords,
} from "@/services/sheetsService";
import { readAll, type PendingAction } from "@/lib/storage";
import { useSettings } from "@/lib/settings";
import {
  clearAllLocalOrders,
  loadRecentStatusUpdates,
  loadScheduleOrders,
  purgeMockScheduleOrders,
  SABAN_SHEET_TAB,
  syncScheduleFromSheets,
  update_order_in_sheet,
  type ScheduleOrder,
  type StatusNotificationEvent,
} from "@/services/scheduleService";
import {
  loadWhatsAppConversations,
  processIncomingCustomerMessage,
  SABAN_CUSTOMERS_TAB,
  SABAN_WHATSAPP_TAB,
  type WhatsAppConversation,
} from "@/services/whatsappService";
import { getBrainKpis } from "@/services/noaBrainService";
import { playMobileChime } from "@/services/audioService";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דשבורד מחווני ידע ובקרה | נועה AI" },
      {
        name: "description",
        content:
          "דשבורד מחווני ידע ובקרה (Telematics KPIs), 21 כללי DNA פעילים, וסידור עבודה מבצעי של ח. סבן.",
      },
      { property: "og:title", content: "דשבורד מחווני ידע ובקרה | נועה AI" },
      {
        property: "og:description",
        content:
          "דשבורד מחווני ידע ובקרה (Telematics KPIs), 21 כללי DNA פעילים, וסידור עבודה מבצעי של ח. סבן.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const { online } = useSettings();
  const { position, status, error, request } = useGeolocation();

  const records = useQuery({ queryKey: ["records"], queryFn: fetchRecords });
  const queue = useQuery({ queryKey: ["queue"], queryFn: () => readAll<PendingAction>("queue") });

  const rows = records.data ?? [];
  const synced = rows.filter((row) => row.status === "synced").length;
  const pending = rows.filter((row) => row.status === "pending").length;
  const failed = rows.filter((row) => row.status === "failed").length;

  const [scheduleOrders, setScheduleOrders] = useState<ScheduleOrder[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<StatusNotificationEvent[]>([]);
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string>("מתחבר לענן…");
  const [kpis, setKpis] = useState(getBrainKpis());

  // Simulation state for incoming Make WhatsApp message
  const [simPhone, setSimPhone] = useState("0507654321");
  const [simText, setSimText] = useState("שלום נועה, איפה עומדת ההזמנה שלי למוצקין 22?");
  const [isProcessingMsg, setIsProcessingMsg] = useState(false);
  const [lastDispatchedReply, setLastDispatchedReply] = useState<{
    reply: string;
    isRecognized: boolean;
    customerName: string;
    phone: string;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    // מחיקת נתוני דמה היסטוריים מיידית בעת טעינת הממשק
    purgeMockScheduleOrders();
    void purgeMockRecords();

    setScheduleOrders(loadScheduleOrders());
    setRecentUpdates(loadRecentStatusUpdates());
    setConversations(loadWhatsAppConversations());
    setKpis(getBrainKpis());

    // בדיקת חיבור ענן וסנכרון חי ראשוני מול הגיליון של סבן
    void checkSheetsCloudConnection().then((res) => {
      setCloudStatus(res.message);
    });

    void syncScheduleFromSheets().then((res) => {
      if (res.orders && res.orders.length > 0) {
        setScheduleOrders(res.orders);
        void queryClient.invalidateQueries({ queryKey: ["records"] });
      }
    });

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

    const handleWhatsAppUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<WhatsAppConversation[]>;
      if (customEvent.detail) {
        setConversations(customEvent.detail);
      } else {
        setConversations(loadWhatsAppConversations());
      }
    };

    const handleDnaRulesUpdate = () => {
      setKpis(getBrainKpis());
    };

    window.addEventListener("saban_schedule_updated", handleScheduleUpdate);
    window.addEventListener("saban_order_status_updated", handleStatusUpdate);
    window.addEventListener("saban_whatsapp_updated", handleWhatsAppUpdate);
    window.addEventListener("saban_dna_rules_updated", handleDnaRulesUpdate);

    return () => {
      window.removeEventListener("saban_schedule_updated", handleScheduleUpdate);
      window.removeEventListener("saban_order_status_updated", handleStatusUpdate);
      window.removeEventListener("saban_whatsapp_updated", handleWhatsAppUpdate);
      window.removeEventListener("saban_dna_rules_updated", handleDnaRulesUpdate);
    };
  }, [queryClient]);

  const handleSyncFromSheets = async () => {
    setIsSyncingSheets(true);
    try {
      const res = await syncScheduleFromSheets();
      setScheduleOrders(res.orders);
      void queryClient.invalidateQueries({ queryKey: ["records"] });
      if (res.orders.length > 0) {
        toast.success(res.message);
      } else {
        toast.info("סונכרן מול הגיליון: אין כרגע הזמנות פתוחות בלוח");
      }
    } catch {
      toast.error("שגיאה בהתחברות לגיליון Apps Script");
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handlePurgeMockData = async () => {
    purgeMockScheduleOrders();
    const count = await purgeMockRecords();
    localStorage.removeItem("saban_unified_orders_v2");
    setScheduleOrders([]);
    void queryClient.invalidateQueries({ queryKey: ["records"] });
    toast.success(`כל נתוני הדמה נוקו בהצלחה (${count} רשומות)! מתחבר לגיליונות בענן…`);
    await handleSyncFromSheets();
  };

  const handleHardReset = async () => {
    clearAllLocalOrders();
    await clearAllRecords();
    setScheduleOrders([]);
    void queryClient.invalidateQueries({ queryKey: ["records"] });
    toast.success("איפוס זיכרון מלא בוצע! טוען כעת את ההזמנות החיות ישירות מ-Google Sheets…");
    await handleSyncFromSheets();
  };

  const handleQuickStatus = (orderId: string, newStatus: string) => {
    update_order_in_sheet(orderId, { status: newStatus });
  };

  const handleSimulateIncoming = async (phone: string, text: string) => {
    if (!phone || !text || isProcessingMsg) return;
    setIsProcessingMsg(true);
    try {
      const result = await processIncomingCustomerMessage(phone, text);
      setConversations(loadWhatsAppConversations());
      playMobileChime();
      setLastDispatchedReply({
        reply: result.reply,
        isRecognized: result.isRecognized,
        customerName: result.customer?.full_name || "לקוח חדש",
        phone,
        timestamp: new Date().toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    } finally {
      setIsProcessingMsg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Welcome & Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <p className="text-xs font-semibold text-sky-400">ח. סבן חומרי בניין (1994) בע״מ</p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-slate-100">
            דשבורד מחווני ידע ובקרה <span className="text-sky-400">נועה AI</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            פורטל PWA היברידי · מוח לוגיסטי SabanOS · סנכרון מערכת מאוחדת ו-Make
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playMobileChime();
              toast.success("צלצול מובייל נועה (587Hz ❯ 880Hz) הופעל בהצלחה");
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-bold text-sky-400 hover:bg-sky-500/20 active:scale-95 transition-all"
            title="השמעת צליל התראה מובייל עצמאי"
          >
            <Volume2 className="size-4" />
            <span>בדיקת צליל</span>
          </button>
          <Link
            to="/data"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-sky-600/30 hover:bg-sky-500 active:scale-95 transition-all"
          >
            <Cpu className="size-4" />
            <span>אימון מוח DNA</span>
          </Link>
        </div>
      </motion.div>

      {/* Hero KPI Card: Operational Accuracy Gauge + 4 Telematics Pillars */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Visual Percentage Gauge (94%) */}
        <GlassCard
          glow
          className="p-6 flex flex-col justify-between border-sky-500/30 bg-gradient-to-br from-slate-900/90 to-slate-900/50"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              מדד דיוק תפעולי כולל
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              ביצועים גבוהים
            </span>
          </div>

          <div className="my-4 flex items-center justify-center gap-6">
            {/* Circular Gauge */}
            <div className="relative grid size-28 place-items-center">
              <svg className="size-28 -rotate-90 transform" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 * (1 - kpis.operationalAccuracy / 100)}
                  strokeLinecap="round"
                  className="text-sky-400 transition-all duration-1000 ease-out"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-100">
                  {kpis.operationalAccuracy}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">דיוק מוח</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="size-4" />
                <span>הצלבת קומקס פעילה</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                מוח נועה מונע טעויות חיוב, אוכף פקדונות 1:1 ומסנכרן לוחות שינוע בזמן אמת.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>סטטוס ענן:</span>
            <span className="text-sky-400 font-mono font-medium">{cloudStatus}</span>
          </div>
        </GlassCard>

        {/* 4 Live Knowledge & Telematics KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
          <Link to="/data" className="block group">
            <GlassCard className="p-4 h-full border-slate-800 hover:border-sky-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl bg-sky-500/15 text-sky-400 group-hover:scale-105 transition-transform">
                  <Cpu className="size-5" />
                </span>
                <span className="text-xs font-semibold text-sky-400 group-hover:underline">
                  פתח סטודיו ←
                </span>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-100">{kpis.activeDnaRules} כללים</p>
              <p className="text-xs font-bold text-slate-300">כללי DNA פעילים</p>
              <p className="mt-1 text-[11px] text-slate-400">
                כולל כלל הפינג-פונג, חוקי פקדונות 1:1 והשפה הערבית
              </p>
            </GlassCard>
          </Link>

          <GlassCard className="p-4 h-full border-slate-800">
            <span className="grid size-10 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Users className="size-5" />
            </span>
            <p className="mt-3 text-2xl font-black text-slate-100">
              {kpis.verifiedCustomers} לקוחות
            </p>
            <p className="text-xs font-bold text-slate-300">לקוחות מאומתים</p>
            <p className="mt-1 text-[11px] text-slate-400">
              סנכרון מלא מול איתוראן ותיקי לקוחות (לי-רן, ערוגת הבשם)
            </p>
          </GlassCard>

          <GlassCard className="p-4 h-full border-slate-800">
            <span className="grid size-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
              <BookOpen className="size-5" />
            </span>
            <p className="mt-3 text-2xl font-black text-slate-100">
              {kpis.dictionaryTermsCount.toLocaleString()} מק״טים
            </p>
            <p className="text-xs font-bold text-slate-300">מונחים במילון לוגיסטי</p>
            <p className="mt-1 text-[11px] text-slate-400">
              נרמול סלנג קומקס אוטונומי ומילון משודרג
            </p>
          </GlassCard>

          <GlassCard className="p-4 h-full border-slate-800">
            <span className="grid size-10 place-items-center rounded-2xl bg-purple-500/15 text-purple-400">
              <History className="size-5" />
            </span>
            <p className="mt-3 text-2xl font-black text-slate-100">
              {kpis.activeHistoryOrders} הזמנות
            </p>
            <p className="text-xs font-bold text-slate-300">הזמנות מתועדות בהיסטוריה</p>
            <p className="mt-1 text-[11px] text-slate-400">
              מסונכרן מול גיליון מאגר מידע נועה ומערכת מאוחדת
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Fleet Telematics & Protocol Strip */}
      <GlassCard className="p-4 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="size-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">
              מחווני צי רכב ותקשורת שטח (Telematics Fleet)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">מחסנים:</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 font-mono">
              🏭 4 החרש 10
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 font-mono">
              🏟️ 1 התלמיד 6
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-400">חכמת | מרצדס מנוף</span>
              <span className="font-mono text-[11px] text-slate-400">615-41-002</span>
            </div>
            <p className="text-slate-300">עומס: 18 בלות / 26 טון | יציאה: 07:00</p>
            <p className="text-[11px] text-slate-400">מחסן 4 החרש 10 (פריקות מנוף לגובה)</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">עלי | איסוזו פלטה</span>
              <span className="font-mono text-[11px] text-slate-400">651-51-701</span>
            </div>
            <p className="text-slate-300">חלוקה מהירה | פריקה ידנית</p>
            <p className="text-[11px] text-slate-400">מחסן 1 התלמיד 6 (גבס, דבקים וצבעים)</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">משאית רמסע מכולות</span>
              <span className="text-[11px] text-slate-400">פסולת בניין</span>
            </div>
            <p className="text-slate-300">קיבולת 8 קוב תקנית</p>
            <p className="text-[11px] text-slate-400">החלפת מכולות לפי דרישה</p>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400 flex items-center gap-1">
                <ShieldAlert className="size-3.5" />
                פרוטוקול מנכ״ל
              </span>
              <span className="font-mono text-[11px] text-rose-300">050-5227724</span>
            </div>
            <p className="text-rose-200">הראל אידלסון — קו אדום עליון</p>
            <p className="text-[11px] text-rose-400 font-semibold">Priority 1 מיידי בכל סבב</p>
          </div>
        </div>
      </GlassCard>

      {/* Live Saban Schedule Section (דוח_בוקר_מבצעי / הזמנות) */}
      <GlassCard delay={0.2} glow className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border/70 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary/20 text-primary shadow-sm">
              <TableProperties className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">סידור עבודה מבצעי (מערכת מאוחדת)</h2>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ענן חי
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                סנכרון ישיר מול גיליון Google Sheets · אפס נתוני דמה
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleSyncFromSheets}
              disabled={isSyncingSheets}
              title="סנכרן הזמנות מגיליון ענן מערכת מאוחדת"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 active:scale-95 transition-all"
            >
              <RefreshCw className={cn("size-3.5", isSyncingSheets && "animate-spin")} />
              <span>{isSyncingSheets ? "מסנכרן מהענן…" : "סנכרן מגיליון ענן"}</span>
            </button>

            <button
              onClick={handlePurgeMockData}
              title="מחק כל נתון דמה מהזיכרון המקומי ובצע סנכרון נקי"
              className="inline-flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 active:scale-95 transition-all"
            >
              <Trash2 className="size-3.5" />
              <span>נקה דמה</span>
            </button>

            <button
              onClick={handleHardReset}
              title="איפוס מלא של הזיכרון המקומי וטעינה ישירה מ-Google Sheets"
              className="inline-flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            >
              <span>איפוס מלא</span>
            </button>

            <span className="rounded-xl border border-glass-border bg-glass px-2.5 py-1.5 text-muted-foreground">
              חכמת: {scheduleOrders.filter((o) => o.driver.includes("חכמת")).length}
            </span>
            <span className="rounded-xl border border-glass-border bg-glass px-2.5 py-1.5 text-muted-foreground">
              עלי: {scheduleOrders.filter((o) => o.driver.includes("עלי")).length}
            </span>
          </div>
        </div>

        {/* Orders list with 1-click status update actions */}
        <div className="mt-4 space-y-3">
          {scheduleOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-glass-border bg-glass/20 p-8 text-center space-y-3">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <TableProperties className="size-6" />
              </div>
              <p className="font-bold text-foreground">אין הזמנות מקומיות בסידור כרגע</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                כל נתוני הדמה נוקו בהצלחה. לחץ על הכפתור לסנכרון מיידי של ההזמנות החיות מגיליון
                מערכת מאוחדת של ח. סבן בענן.
              </p>
              <button
                onClick={handleSyncFromSheets}
                disabled={isSyncingSheets}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <RefreshCw className={cn("size-3.5", isSyncingSheets && "animate-spin")} />
                {isSyncingSheets ? "מסנכרן כעת מהענן…" : "סנכרן הזמנות מגיליון ענן עכשיו"}
              </button>
            </div>
          ) : (
            scheduleOrders.map((order, idx) => {
              const isDelivered = order.status.includes("סופק");
              const isEnRoute = order.status.includes("יצא לדרך");

              return (
                <div
                  key={`${order.order_id}-${order.round_time || ""}-${idx}`}
                  className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-glass/60 p-4 transition-all hover:bg-glass sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        #{order.order_id}
                      </span>
                      <span className="font-bold text-foreground">{order.customer_name}</span>
                      <span className="rounded bg-black/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {order.round_time}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{order.warehouse}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Truck className="size-3 text-primary" />
                        {order.driver}
                      </span>
                      <span className="truncate">📦 {order.items}</span>
                      <span className="text-[11px] font-medium text-amber-400">
                        🔄 {order.deposits}
                      </span>
                      {order.waze_url ? (
                        <a
                          href={order.waze_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:underline"
                        >
                          <Navigation className="size-3" />
                          Waze
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* Status Badges and Quick Change Trigger */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        isDelivered
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                          : isEnRoute
                            ? "border-primary/30 bg-primary/15 text-primary"
                            : "border-warning/30 bg-warning/15 text-warning",
                      )}
                    >
                      {order.status}
                    </span>

                    {/* 1-click status update buttons that trigger real-time Toast */}
                    {!isDelivered ? (
                      <button
                        onClick={() => handleQuickStatus(order.order_id, "סופק במלואו")}
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 active:scale-95"
                        title="לחיצה תעדכן את הגיליון ותקפיץ התראת Toast לראמי"
                      >
                        <CheckCircle2 className="size-3.5" />
                        סמן כסופק
                      </button>
                    ) : null}

                    {!isEnRoute && !isDelivered ? (
                      <button
                        onClick={() => handleQuickStatus(order.order_id, "יצא לדרך")}
                        className="inline-flex items-center gap-1 rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-all hover:bg-primary/20 active:scale-95"
                        title="לחיצה תעדכן את הגיליון ותקפיץ התראת Toast לראמי"
                      >
                        <Truck className="size-3.5" />
                        יצא לדרך
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent Toast Status Updates Stream */}
        {recentUpdates.length > 0 ? (
          <div className="mt-4 border-t border-glass-border/70 pt-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Bell className="size-3.5 text-primary" />
                התראות סטטוס שנמסרו לראמי בזמן אמת (Toast Log):
              </span>
              <span className="text-[11px] opacity-75">{recentUpdates.length} עדכונים</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentUpdates.slice(0, 4).map((upd, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass/40 px-3 py-1.5 text-xs"
                >
                  <Sparkles className="size-3 text-primary" />
                  <span className="font-bold">הזמנה {upd.order_id}</span>
                  <span className="text-muted-foreground">({upd.customer_name})</span>
                  <span className="font-semibold text-foreground">⬅️ {upd.newStatus}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(upd.timestamp).toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </GlassCard>

      {/* Make WhatsApp Communication Pipeline & Customer Recognition */}
      <GlassCard delay={0.25} glow className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass-border/70 pb-4">
          <div className="flex items-center gap-3">
            <span className="relative grid size-10 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400 shadow-sm">
              <MessageSquare className="size-5" />
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  נועה AI — זיהוי לקוחות לפי טלפון וניהול שיחה רציפה
                </h2>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                  Make Live Pipeline
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                מאזין לצינור התקשורת של Make, מזהה מול אינדקס_לקוחות, משיב פרסונלית ומשדר ב-POST
                /api/send
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-xl border border-glass-border bg-glass px-2.5 py-1 text-muted-foreground">
              לשונית לקוחות: <strong className="text-foreground">{SABAN_CUSTOMERS_TAB}</strong>
            </span>
            <span className="rounded-xl border border-glass-border bg-glass px-2.5 py-1 text-muted-foreground">
              תיעוד: <strong className="text-foreground">{SABAN_WHATSAPP_TAB}</strong>
            </span>
          </div>
        </div>

        {/* 3-Step Protocol Visual Summary */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-glass-border bg-glass/40 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <UserCheck className="size-4 text-primary" />
              <span>1. שלב זיהוי הלקוח</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              בדיקה מול הגיליון לפי טלפון: שליפת שם, חברה, אתר, היסטוריית הזמנות ונהג משויך
              (חכמת/עלי). אם אינו מוכר — פנייה מנומסת ובירור.
            </p>
          </div>

          <div className="rounded-2xl border border-glass-border bg-glass/40 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Sparkles className="size-4 text-emerald-400" />
              <span>2. מענה פרסונלי רציף</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              פנייה חמה בשם פרטי, חיבור ישיר לסטטוס האספקה או החומרים, ושימור הקשר של הודעות קודמות
              ללא חזרה על דברים.
            </p>
          </div>

          <div className="rounded-2xl border border-glass-border bg-glass/40 p-3 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Send className="size-4 text-sky-400" />
              <span>3. סגירת מעגל ושידור</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              שידור חוזר ישיר ל-POST /api/send (Local Dispatch), תיעוד ב-שיחות_וואטסאפ_נועה והקפצת
              Toast התראה לראמי.
            </p>
          </div>
        </div>

        {/* Interactive Make Inbound Simulator */}
        <div className="mt-5 rounded-2xl border border-glass-border bg-glass/50 p-4">
          <p className="mb-2 text-xs font-bold text-foreground flex items-center gap-1.5">
            <Phone className="size-3.5 text-primary" />
            סימולציית הודעה נכנסת מצינור Make (בדיקת זיהוי ומענה):
          </p>

          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setSimPhone("0507654321");
                setSimText("שלום נועה, איפה עומדת ההזמנה שלי למוצקין 22?");
              }}
              className="rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-glass/80 transition-colors"
            >
              👤 יוסף לוי (לי-רן השקעות)
            </button>
            <button
              onClick={() => {
                setSimPhone("0503339999");
                setSimText("אפשר להוסיף 2 בלות חול להזמנה של היום?");
              }}
              className="rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-glass/80 transition-colors"
            >
              👤 דניאל קליין (דניאל הנדסה)
            </button>
            <button
              onClick={() => {
                setSimPhone("0544448888");
                setSimText("מה הסטטוס של הזמנה 6215504?");
              }}
              className="rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-glass/80 transition-colors"
            >
              👤 אבי לוי (שיפוצים)
            </button>
            <button
              onClick={() => {
                setSimPhone("0505669924");
                setSimText(
                  "👤 יהודה כהן (לי-רן מוצקין)\n📱 0505669924\nנועה תשלחי לי מחר בבוקר 2 בלות חול ו-40 מלט למוצקין 22 ברעננה עם חכמת.",
                );
              }}
              className="rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 px-2.5 py-1 text-[11px] font-medium hover:bg-sky-500/20 transition-colors"
            >
              🔔 פניית JONI (לי-רן)
            </button>
            <button
              onClick={() => {
                setSimPhone("0505669924");
                setSimText("קומקס 6215715: תוספת 50 מטר פלציב ו-24 קלקר שלא הופיעו בהודעה");
              }}
              className="rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 px-2.5 py-1 text-[11px] font-medium hover:bg-purple-500/20 transition-colors"
            >
              🚨 הצלבת קומקס 6215715
            </button>
            <button
              onClick={() => {
                setSimPhone("0521112233");
                setSimText("שלום, כמה עולה משלוח מלט לפתח תקווה?");
              }}
              className="rounded-full border border-glass-border bg-amber-500/10 border-amber-500/30 text-amber-400 px-2.5 py-1 text-[11px] font-medium hover:bg-amber-500/20 transition-colors"
            >
              ⚠️ לקוח חדש לא מוכר
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-[11px] text-muted-foreground">
                מספר טלפון (sender_phone):
              </label>
              <input
                type="text"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
                placeholder="050-7654321"
                className="w-full rounded-xl border border-glass-border bg-glass px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] text-muted-foreground">
                טקסט ההודעה (text):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="הודעת הוואטסאפ של הלקוח..."
                  className="flex-1 rounded-xl border border-glass-border bg-glass px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  onClick={() => void handleSimulateIncoming(simPhone, simText)}
                  disabled={isProcessingMsg}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Send className="size-3.5 rtl:-scale-x-100" />
                  {isProcessingMsg ? "מעבד…" : "שדר ל-Make"}
                </button>
              </div>
            </div>
          </div>

          {/* Last Dispatched Response Preview */}
          {lastDispatchedReply ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">
                    {lastDispatchedReply.isRecognized ? "✅ זוהה בהצלחה:" : "👤 לקוח חדש:"}{" "}
                    {lastDispatchedReply.customerName} ({lastDispatchedReply.phone})
                  </span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    שודר ל-POST /api/send
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {lastDispatchedReply.timestamp}
                </span>
              </div>
              <p className="whitespace-pre-wrap rounded-lg bg-black/20 p-2 font-mono text-[11px] text-emerald-200">
                {lastDispatchedReply.reply}
              </p>
            </motion.div>
          ) : null}
        </div>

        {/* Recent Conversations Log */}
        {conversations.length > 0 ? (
          <div className="mt-4 border-t border-glass-border/70 pt-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>שיחות וואטסאפ פעילות (\`{SABAN_WHATSAPP_TAB}\`):</span>
              <span className="text-[10px]">{conversations.length} לקוחות בשיחה</span>
            </p>
            <div className="space-y-2">
              {conversations.slice(0, 3).map((conv, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-glass-border bg-glass/40 p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <User className="size-3.5 text-primary" />
                    <div>
                      <span className="font-bold text-foreground">{conv.customer_name}</span>
                      {conv.company_name ? (
                        <span className="text-muted-foreground"> ({conv.company_name})</span>
                      ) : null}
                      <span className="mx-1 text-[10px] text-muted-foreground font-mono">
                        {conv.phone}
                      </span>
                    </div>
                  </div>
                  <div className="truncate max-w-md text-muted-foreground text-[11px]">
                    {conv.messages[conv.messages.length - 1]?.text}
                  </div>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-primary/15 text-primary font-semibold">
                    {conv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </GlassCard>

      {/* Lower Grid: Recent Sync Activity & Geolocation */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard delay={0.3} className="lg:col-span-2">
          <SectionTitle title="פעילות סנכרון כללית" subtitle="רשומות ומסמכים שסונכרנו ל-Sheets" />
          <div className="space-y-2">
            {rows.slice(0, 5).map((row, idx) => (
              <div
                key={`${row.id}-${idx}`}
                className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass px-4 py-3"
              >
                <Activity className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.interfaceName} · {new Date(row.timestamp).toLocaleString("he-IL")}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין עדיין פעילות להצגה.</p>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard delay={0.35} glow>
          <SectionTitle title="איכון שטח ומיקום" subtitle="GPS עדכני לסידור" />
          <div className="rounded-2xl border border-glass-border bg-glass p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                <MapPin className="size-5" />
              </span>
              <div className="text-sm">
                {position ? (
                  <>
                    <p className="font-medium">
                      {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      דיוק ±{Math.round(position.accuracy)} מ׳ ·{" "}
                      {new Date(position.timestamp).toLocaleTimeString("he-IL")}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    {status === "denied"
                      ? (error ?? "ההרשאה נדחתה")
                      : status === "unsupported"
                        ? "הדפדפן אינו תומך באיכון"
                        : "טרם נקלט מיקום"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={request}
              disabled={status === "requesting"}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
            >
              <Crosshair className="size-4" />
              {status === "requesting" ? "מאתר…" : "קלוט מיקום"}
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {online
              ? "סנכרון מבצעי חי מול Google Sheets ו-Drive."
              : "עבודה באופליין — שינויים נשמרים מקומית."}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone: string;
  delay: number;
}) {
  return (
    <GlassCard delay={delay} className="p-4">
      <Icon className={`size-5 ${tone}`} />
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </GlassCard>
  );
}

export function StatusBadge({ status }: { status: "pending" | "synced" | "failed" }) {
  const map = {
    synced: { label: "מסונכרן", cls: "text-success" },
    pending: { label: "ממתין", cls: "text-warning" },
    failed: { label: "נכשל", cls: "text-destructive" },
  } as const;
  return (
    <span
      className={`shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] ${map[status].cls}`}
    >
      {map[status].label}
    </span>
  );
}
