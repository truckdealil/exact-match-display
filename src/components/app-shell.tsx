import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, Cpu, LayoutDashboard, MessageSquare, Moon, Sun, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings";
import { NotificationPermissionModal } from "@/components/notification-modal";
import { InstallPrompt } from "@/components/install-prompt";
import { GeminiAssistant } from "@/components/gemini-assistant";
import { PWAInstallButton } from "@/components/pwa-install-button";
import { playMobileChime } from "@/services/audioService";

const NAV = [
  { to: "/", label: "דשבורד ידע", icon: LayoutDashboard },
  { to: "/data", label: "אימון מוח DNA", icon: Cpu },
  { to: "/storage", label: "סימולטור פינג-פונג", icon: MessageSquare },
  { to: "/settings", label: "התראות & פוש", icon: Bell },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme, online, hydrated } = useSettings();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="glass-panel fixed inset-y-0 right-0 z-40 hidden w-64 flex-col gap-2 rounded-none border-y-0 border-l border-r-0 p-5 lg:flex">
        <BrandMark />
        <nav className="mt-6 flex flex-col gap-1.5">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  active && "text-foreground font-semibold",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-2xl bg-sky-500/15 ring-1 ring-sky-500/30"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  />
                ) : null}
                <item.icon
                  className={cn("relative size-4", active ? "text-sky-400" : "text-slate-400")}
                />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 text-xs text-muted-foreground">
          <StatusPill online={online} hydrated={hydrated} />
          <p className="text-[11px] text-slate-400">ח. סבן | נועה AI v2.5 PWA</p>
        </div>
      </aside>

      <header className="glass-panel sticky top-0 z-30 flex items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 py-3 lg:pr-72">
        <div className="lg:hidden">
          <BrandMark compact />
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <StatusPill online={online} hydrated={hydrated} />
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <button
            onClick={() => {
              playMobileChime();
              toast.info("צליל מובייל נועה הושמע (587Hz ❯ 880Hz)");
            }}
            aria-label="בדיקת צליל מובייל"
            title="בדיקת צליל מובייל נועה (587Hz ❯ 880Hz)"
            className="grid size-10 place-items-center rounded-2xl border border-glass-border bg-glass transition-transform active:scale-90 text-sky-400 hover:text-sky-300"
          >
            <Volume2 className="size-4" />
          </button>
          <button
            onClick={() => setNotifyOpen(true)}
            aria-label="התראות"
            className="grid size-10 place-items-center rounded-2xl border border-glass-border bg-glass transition-transform active:scale-90"
          >
            <Bell className="size-4" />
          </button>
          <button
            onClick={toggleTheme}
            aria-label="החלפת ערכת נושא"
            className="grid size-10 place-items-center rounded-2xl border border-glass-border bg-glass transition-transform active:scale-90"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-6 lg:pr-72 lg:pb-12">{children}</main>

      {/* Mobile Bottom Navigation Bar - 4 Quick Tabs with min 48px touch targets */}
      <nav className="glass-strong fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-3xl p-1.5 lg:hidden shadow-2xl border border-slate-700/60 bg-slate-900/90 backdrop-blur-xl">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-medium text-slate-400 transition-colors touch-manipulation",
                active && "text-sky-400 font-bold",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="nav-active-mobile"
                  className="absolute inset-0 rounded-2xl bg-sky-500/15"
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                />
              ) : null}
              <item.icon className="relative size-5" />
              <span className="relative leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <GeminiAssistant />
      <InstallPrompt />
      <NotificationPermissionModal open={notifyOpen} onOpenChange={setNotifyOpen} />
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-lg font-black text-white shadow-md shadow-sky-600/30">
        ס
      </span>
      <div className={cn(compact && "hidden sm:block")}>
        <p className="text-sm font-bold leading-tight text-sky-400">ח. סבן | נועה AI</p>
        <p className="text-[11px] text-slate-400">אימון מוח ומרכז שליטה לוגיסטי</p>
      </div>
    </div>
  );
}

function StatusPill({ online, hydrated }: { online: boolean; hydrated: boolean }) {
  if (!hydrated) return <span className="text-xs text-muted-foreground">בודק ענן…</span>;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-2.5 py-1",
          online ? "text-success border-emerald-500/30" : "text-warning border-amber-500/30",
        )}
        title="סטטוס חיבור לגיליון מערכת מאוחדת בענן"
      >
        <span className={cn("size-2 rounded-full", online ? "bg-emerald-400" : "bg-amber-400")} />
        <span>ענן מאוחדת</span>
      </span>
      <span
        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-primary border-primary/30"
        title="מוח לוגיסטי SabanOS פעיל"
      >
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        <span>שרת נועה</span>
      </span>
    </div>
  );
}
