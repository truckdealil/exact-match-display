import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Moon, Sparkles, Sun, Table, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { useSettings } from "@/lib/settings";
import { audioService } from "@/services/audioService";
import { NotificationPermissionModal } from "@/components/notification-modal";
import { currentPermission, isOneSignalConfigured } from "@/services/oneSignal";
import { isSheetsConfigured } from "@/services/sheetsService";
import { checkGeminiConfigured, isGeminiConfigured } from "@/services/geminiService";

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
  const [geminiOk, setGeminiOk] = useState(isGeminiConfigured());

  useEffect(() => {
    setPermission(currentPermission());
  }, [notifyOpen]);

  useEffect(() => {
    void checkGeminiConfigured().then(setGeminiOk);
  }, []);

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
          <SectionTitle title="חיבורים" subtitle="מפתחות סביבה נדרשים" />
          <div className="space-y-2 text-sm">
            <ConnectionRow
              icon={Bell}
              label="OneSignal"
              env="VITE_ONESIGNAL_APP_ID"
              ok={isOneSignalConfigured()}
            />
            <ConnectionRow
              icon={Table}
              label="Google Sheets"
              env="VITE_GOOGLE_APPS_SCRIPT_URL"
              ok={isSheetsConfigured()}
            />
            <ConnectionRow icon={Sparkles} label="Gemini AI" env="GEMINI_API_KEY" ok={geminiOk} />
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
