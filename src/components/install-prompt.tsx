import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "luxe-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);
    if (ios) {
      const timer = window.setTimeout(() => setOpen(true), 2500);
      return () => window.clearTimeout(timer);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="glass-strong fixed inset-x-4 bottom-24 z-50 rounded-3xl p-4 md:inset-x-auto md:left-6 md:bottom-6 md:w-96"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
              {isIos ? <Share className="size-5" /> : <Download className="size-5" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold">התקנת האפליקציה</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isIos
                  ? 'בספארי: שיתוף ← "הוסף למסך הבית" כדי להתקין את האפליקציה.'
                  : "התקן את המערכת למסך הבית לגישה מהירה ועבודה במצב לא מקוון."}
              </p>
              {!isIos ? (
                <button
                  onClick={install}
                  className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
                >
                  התקן עכשיו
                </button>
              ) : null}
            </div>
            <button
              onClick={dismiss}
              aria-label="סגור"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
