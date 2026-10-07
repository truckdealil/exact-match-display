import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CheckCircle,
  Cloud,
  ExternalLink,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  Table,
  Trash2,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { useSettings } from "@/lib/settings";
import { audioService } from "@/services/audioService";
import { NotificationPermissionModal } from "@/components/notification-modal";
import { currentPermission, isOneSignalConfigured } from "@/services/oneSignal";
import {
  checkSheetsCloudConnection,
  clearAllRecords,
  DEFAULT_APPS_SCRIPT_TOKEN,
  DEFAULT_APPS_SCRIPT_URL,
  getAppsScriptEndpoint,
  getAppsScriptToken,
  isSheetsConfigured,
  NOA_AI_SPREADSHEET_ID,
  purgeMockRecords,
  UNIFIED_SPREADSHEET_ID,
} from "@/services/sheetsService";
import {
  clearAllLocalOrders,
  purgeMockScheduleOrders,
  syncScheduleFromSheets,
} from "@/services/scheduleService";
import { isGeminiConfigured } from "@/services/geminiService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "הגדרות וחיבורי ענן | מרכז שליטה" },
      {
        name: "description",
        content: "ניהול חיבורי Google Sheets, הגדרות וירסל (Vercel), התראות דחיפה וצלילים.",
      },
      { property: "og:title", content: "הגדרות וחיבורי ענן | מרכז שליטה" },
      {
        property: "og:description",
        content: "ניהול חיבורי Google Sheets, הגדרות וירסל (Vercel), התראות דחיפה וצלילים.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme, soundEnabled, setSoundEnabled, volume, setVolume } = useSettings();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [cloudResult, setCloudResult] = useState<{
    connected: boolean;
    message: string;
    sheets?: string[];
  } | null>(null);

  const [customEndpoint, setCustomEndpoint] = useState(getAppsScriptEndpoint());
  const [customToken, setCustomToken] = useState(getAppsScriptToken());

  const geminiOk = isGeminiConfigured();

  useEffect(() => {
    setPermission(currentPermission());
    void checkSheetsCloudConnection().then((res) => setCloudResult(res));
  }, [notifyOpen]);

  const handleTestCloudConnection = async () => {
    setIsCheckingCloud(true);
    try {
      const res = await checkSheetsCloudConnection();
      setCloudResult(res);
      if (res.connected) {
        toast.success(res.message);
        void audioService.play("success");
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsCheckingCloud(false);
    }
  };

  const handleSaveEndpoint = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("saban_custom_apps_script_url", customEndpoint.trim());
      localStorage.setItem("saban_custom_apps_script_token", customToken.trim());
      toast.success("כתובת Google Apps Script עודכנה בהצלחה!");
      void handleTestCloudConnection();
    }
  };

  const handleResetToDefault = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("saban_custom_apps_script_url");
      localStorage.removeItem("saban_custom_apps_script_token");
      setCustomEndpoint(DEFAULT_APPS_SCRIPT_URL);
      setCustomToken(DEFAULT_APPS_SCRIPT_TOKEN);
      toast.success("שוחזרו הגדרות ברירת המחדל של ענן וירסל / Apps Script");
      void handleTestCloudConnection();
    }
  };

  const handlePurgeAllMockData = async () => {
    purgeMockScheduleOrders();
    const purgedCount = await purgeMockRecords();
    toast.success(`נוקו נתוני הדמה בהצלחה (${purgedCount} רשומות). מתחבר לסנכרון ענן…`);
    await syncScheduleFromSheets();
    void handleTestCloudConnection();
  };

  const handleHardResetLocalMemory = async () => {
    clearAllLocalOrders();
    await clearAllRecords();
    toast.success("איפוס מלא בוצע. טוען כעת את כל ההזמנות החיות ישירות מ-Google Sheets…");
    const res = await syncScheduleFromSheets();
    if (res.orders.length > 0) {
      toast.success(`נטענו בהצלחה ${res.orders.length} הזמנות חיות מהגיליון!`);
    }
    void handleTestCloudConnection();
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
        <span className="text-gradient">הגדרות</span> וחיבורי ענן
      </h1>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Google Sheets & Vercel Cloud Connection */}
        <GlassCard glow className="lg:col-span-2">
          <SectionTitle
            title="חיבור גיליונות Google Sheets & ממשק וירסל (Vercel)"
            subtitle="סנכרון ישיר ללא נתוני דמה מול מערכת מאוחדת ונועה AI"
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {/* Status Panel */}
            <div className="rounded-2xl border border-glass-border bg-glass/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-2">
                  <Cloud className="size-4 text-primary" />
                  סטטוס חיבור לענן:
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
                    cloudResult?.connected
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      cloudResult?.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400",
                    )}
                  />
                  {cloudResult?.connected ? "מחובר לגיליונות" : "בודק / שטח"}
                </span>
              </div>

              <p className="text-xs text-foreground font-medium">
                {cloudResult ? cloudResult.message : "מתחבר ל-Google Apps Script…"}
              </p>

              {cloudResult?.sheets && cloudResult.sheets.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] text-muted-foreground mb-1">טאבים שזוהו בגיליון:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cloudResult.sheets.map((sheet, idx) => (
                      <span
                        key={`${sheet}-${idx}`}
                        className="rounded-lg bg-primary/10 border border-primary/25 px-2 py-0.5 text-[11px] font-mono text-primary"
                      >
                        {sheet}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2 border-t border-glass-border/70 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>מערכת מאוחדת (הזמנות):</span>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${UNIFIED_SPREADSHEET_ID}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[11px]"
                  >
                    פתח גיליון <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>נועה AI (דוח בוקר ושיחות):</span>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${NOA_AI_SPREADSHEET_ID}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[11px]"
                  >
                    פתח גיליון <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={handleTestCloudConnection}
                  disabled={isCheckingCloud}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", isCheckingCloud && "animate-spin")} />
                  {isCheckingCloud ? "בודק…" : "בדוק חיבור לענן עכשיו"}
                </button>
                <button
                  onClick={handlePurgeAllMockData}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/20 transition-all active:scale-95"
                >
                  <Trash2 className="size-3.5" />
                  מחק נתוני דמה וסנכרן
                </button>
                <button
                  onClick={handleHardResetLocalMemory}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all active:scale-95"
                >
                  איפוס זיכרון מלא
                </button>
              </div>
            </div>

            {/* Config & Deployment Panel */}
            <div className="rounded-2xl border border-glass-border bg-glass/60 p-4 space-y-3 text-xs">
              <p className="font-bold text-foreground">הגדרות כתובת Google Apps Script ב-Vercel</p>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">
                  כתובת ה-Web App של Apps Script:
                </label>
                <input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full h-9 rounded-xl border border-glass-border bg-glass px-3 font-mono text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">
                  טוקן אבטחה (Secret Token):
                </label>
                <input
                  type="text"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  placeholder="saban_secret_token_2026"
                  className="w-full h-9 rounded-xl border border-glass-border bg-glass px-3 font-mono text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSaveEndpoint}
                  className="rounded-xl bg-primary/20 border border-primary/40 px-3 py-1.5 font-bold text-primary hover:bg-primary/30 active:scale-95 transition-all"
                >
                  שמור כתובת
                </button>
                <button
                  onClick={handleResetToDefault}
                  className="rounded-xl border border-glass-border bg-glass px-3 py-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                >
                  שחזר ברירת מחדל
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Notifications */}
        <GlassCard>
          <SectionTitle title="התראות דחיפה" subtitle="OneSignal Web Push" />
          <p className="text-sm text-muted-foreground">
            מצב הרשאה נוכחי: <span className="text-foreground">{permission}</span>
          </p>
          <button
            onClick={() => setNotifyOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
          >
            <Bell className="size-4" />
            ניהול הרשאות והתראת בדיקה
          </button>
        </GlassCard>

        {/* Bell sound */}
        <GlassCard delay={0.05}>
          <SectionTitle title="צליל פעמון" subtitle="צליל יוקרתי בעת קבלת התראה" />
          <label className="flex items-center justify-between rounded-2xl border border-glass-border bg-glass px-4 py-3 text-sm">
            <span>הפעלת צלילים</span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
              className="size-5 accent-[var(--primary)]"
            />
          </label>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>עוצמת שמע</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                await audioService.unlock();
                void audioService.play("alert");
                toast("מנגן צליל התראה רגיל");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-3.5 py-2 text-xs font-medium transition-transform active:scale-95"
            >
              <Volume2 className="size-3.5" />
              צליל מערכת
            </button>
            <button
              onClick={async () => {
                await audioService.unlock();
                audioService.playMobileChime();
                toast.success("צליל מובייל נועה הושמע (587Hz ❯ 880Hz)");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-400 hover:bg-sky-500/25 transition-transform active:scale-95"
            >
              <Volume2 className="size-3.5" />
              צליל מובייל נועה (587Hz ❯ 880Hz)
            </button>
          </div>
        </GlassCard>

        {/* Theme */}
        <GlassCard delay={0.1}>
          <SectionTitle title="ערכת נושא" subtitle="מצב כהה יוקרתי או טיטניום בהיר" />
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-transform active:scale-95 ${
                theme === "dark"
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-glass-border bg-glass"
              }`}
            >
              <Moon className="size-4" /> כהה
            </button>
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-transform active:scale-95 ${
                theme === "light"
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-glass-border bg-glass"
              }`}
            >
              <Sun className="size-4" /> טיטניום
            </button>
          </div>
        </GlassCard>

        {/* System Integrations Overview */}
        <GlassCard delay={0.15}>
          <SectionTitle title="מערכות וממשקים פעילים" subtitle="SabanOS, Gemini & Push" />
          <div className="space-y-3 text-sm">
            <ConnectionRow
              icon={Table}
              label="Google Sheets (מערכת מאוחדת)"
              env={`Apps Script: ${getAppsScriptEndpoint().slice(0, 40)}…`}
              ok={cloudResult?.connected ?? isSheetsConfigured()}
            />
            <ConnectionRow
              icon={Sparkles}
              label="Gemini AI (Google AI Studio)"
              env="VITE_GEMINI_API_KEY (פועל במצב SabanOS מלא)"
              ok={geminiOk}
            />
            <ConnectionRow
              icon={Bell}
              label="OneSignal Push"
              env="VITE_ONESIGNAL_APP_ID"
              ok={isOneSignalConfigured()}
            />
          </div>
        </GlassCard>
      </div>

      <NotificationPermissionModal open={notifyOpen} onOpenChange={setNotifyOpen} />
    </div>
  );
}

function ConnectionRow({
  icon: Icon,
  label,
  env,
  ok,
}: {
  icon: typeof Bell;
  label: string;
  env: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass px-4 py-3">
      <Icon className="size-4 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="truncate text-[11px] text-muted-foreground">{env}</p>
      </div>
      <span className={`text-xs ${ok ? "text-success" : "text-warning"}`}>
        {ok ? "מחובר" : "לא מוגדר"}
      </span>
    </div>
  );
}
