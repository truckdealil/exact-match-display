import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Cloud, Moon, RefreshCw, Sparkles, Sun, Table, Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { useSettings } from "@/lib/settings";
import { audioService } from "@/services/audioService";
import { NotificationPermissionModal } from "@/components/notification-modal";
import { currentPermission, isOneSignalConfigured } from "@/services/oneSignal";
import {
  checkSheetsCloudConnection,
  getAppsScriptEndpoint,
  isSheetsConfigured,
  purgeMockRecords,
  UNIFIED_SPREADSHEET_ID,
  NOA_AI_SPREADSHEET_ID,
} from "@/services/sheetsService";
import { purgeMockScheduleOrders, syncScheduleFromSheets } from "@/services/scheduleService";
import { isGeminiConfigured } from "@/services/geminiService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "הגדרות והתראות | מרכז שליטה" },
      {
        name: "description",
        content: "ניהול התראות דחיפה, עוצמת צליל הפעמון וערכת הנושא של המערכת.",
      },
      { property: "og:title", content: "הגדרות והתראות | מרכז שליטה" },
      {
        property: "og:description",
        content: "ניהול התראות דחיפה, עוצמת צליל הפעמון וערכת הנושא של המערכת.",
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

  const handlePurgeAllMockData = async () => {
    purgeMockScheduleOrders();
    const purgedCount = await purgeMockRecords();
    localStorage.removeItem("saban_unified_orders_v2");
    toast.success(`נוקו כל נתוני הדמה בהצלחה (${purgedCount} רשומות). מתחבר לסנכרון ענן…`);
    await syncScheduleFromSheets();
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
        <span className="text-gradient">הגדרות</span> והתראות
      </h1>

      <div className="grid gap-4 lg:grid-cols-2">
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
          <button
            onClick={async () => {
              await audioService.unlock();
              void audioService.play("alert");
              toast("מנגן צליל בדיקה");
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-4 py-2.5 text-sm font-medium transition-transform active:scale-95"
          >
            <Volume2 className="size-4" />
            נגן צליל בדיקה
          </button>
        </GlassCard>

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

        <GlassCard delay={0.15}>
          <SectionTitle title="חיבורי ענן ומערכות" subtitle="Google Sheets, Vercel & AI" />
          <div className="space-y-3 text-sm">
            <ConnectionRow
              icon={Table}
              label="Google Sheets (מערכת מאוחדת)"
              env={`Apps Script: ${getAppsScriptEndpoint().slice(0, 45)}…`}
              ok={cloudResult?.connected ?? isSheetsConfigured()}
            />

            {/* Cloud Details Card */}
            <div className="rounded-2xl border border-glass-border bg-glass/40 p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Cloud className="size-3.5 text-primary" />
                  סטטוס ענן:
                </span>
                <span
                  className={cn(
                    "font-medium",
                    cloudResult?.connected ? "text-emerald-400" : "text-amber-400",
                  )}
                >
                  {cloudResult ? cloudResult.message : "בודק חיבור…"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                גיליון יעד: <code className="text-foreground">{UNIFIED_SPREADSHEET_ID}</code>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                גיליון נועה: <code className="text-foreground">{NOA_AI_SPREADSHEET_ID}</code>
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleTestCloudConnection}
                  disabled={isCheckingCloud}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3", isCheckingCloud && "animate-spin")} />
                  {isCheckingCloud ? "בודק…" : "בדוק חיבור לענן עכשיו"}
                </button>
                <button
                  onClick={handlePurgeAllMockData}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="size-3" />
                  מחק נתוני דמה וסנכרן
                </button>
              </div>
            </div>

            <ConnectionRow
              icon={Sparkles}
              label="Gemini AI (Google AI Studio)"
              env="VITE_GEMINI_API_KEY (פועל במצב SabanOS מקומי מלא)"
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
