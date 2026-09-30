import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { audioService } from "@/services/audioService";
import {
  currentPermission,
  initOneSignal,
  isOneSignalConfigured,
  requestPushPermission,
  showLocalNotification,
} from "@/services/oneSignal";

export function NotificationPermissionModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    try {
      await audioService.unlock();
      if (currentPermission() === "unsupported") {
        toast.error("הדפדפן אינו תומך בהתראות");
        return;
      }
      const permission = await requestPushPermission();
      if (permission === "granted") {
        if (isOneSignalConfigured()) await initOneSignal().catch(() => undefined);
        void audioService.play("success");
        toast.success("ההתראות הופעלו בהצלחה");
        onOpenChange(false);
      } else {
        toast.error("ההרשאה נדחתה — ניתן לאשר מחדש בהגדרות הדפדפן");
      }
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    await audioService.unlock();
    void audioService.play("alert");
    showLocalNotification("התראה לדוגמה", "צליל הפעמון הייחודי נשמע כעת.");
    toast("התראת בדיקה נשלחה", { description: "צליל הפעמון הופעל" });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
            className="glass-strong glow-ring w-full max-w-md rounded-3xl p-6"
          >
            <div className="flex items-start justify-between">
              <div className="grid size-12 place-items-center rounded-2xl bg-accent/15 text-accent">
                <BellRing className="size-6" />
              </div>
              <button onClick={() => onOpenChange(false)} aria-label="סגור">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <h3 className="mt-4 text-lg font-semibold">הפעלת התראות בזמן אמת</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              קבל עדכוני סטטוס מיידיים עם צליל פעמון יוקרתי, גם כשהאפליקציה סגורה. מצב ההרשאה
              הנוכחי: <span className="text-foreground">{currentPermission()}</span>
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={enable}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
              >
                <Bell className="size-4" />
                אפשר התראות
              </button>
              <button
                onClick={test}
                className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-4 py-2 text-sm font-medium transition-transform active:scale-95"
              >
                <Volume2 className="size-4" />
                בדיקת צליל
              </button>
            </div>
            {!isOneSignalConfigured() ? (
              <p className="mt-4 text-xs text-muted-foreground">
                OneSignal יופעל אוטומטית לאחר הגדרת המפתח VITE_ONESIGNAL_APP_ID.
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
