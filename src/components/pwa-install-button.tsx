import { useState } from "react";
import { Download, Share2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";

export function PWAInstallButton({ className }: { className?: string }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isInstalled) {
    return (
      <span
        className={cn(
          "hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400",
          className,
        )}
      >
        <Check className="size-3.5" />
        <span>אפליקציה מותקנת</span>
      </span>
    );
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-primary px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:brightness-110 active:scale-95 transition-all",
            className,
          )}
          title="התקן את אפליקציית נועה AI למסך הבית"
        >
          <Download className="size-3.5" />
          <span>התקן אפליקציה</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIosGuide(true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500/25 active:scale-95 transition-all",
            className,
          )}
          title="הוראות התקנה לאייפון / ספארי"
        >
          <Share2 className="size-3.5" />
          <span>התקנה ב-iOS</span>
        </button>
      )}

      {!isIOS && !isInstallable && (
        <button
          onClick={() => {
            toast.info(
              "להתקנה: לחץ על שלוש הנקודות בדפדפן (תפריט) ובחר 'התקן אפליקציה' או 'הוסף למסך הבית'.",
            );
          }}
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 rounded-xl border border-glass-border bg-glass px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all",
            className,
          )}
        >
          <Download className="size-3.5" />
          <span>התקן לבית</span>
        </button>
      )}

      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 text-right shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-sky-400">התקנה באייפון / אייפד (Safari)</h3>
              <button
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <p className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400">
                  1
                </span>
                לחץ על כפתור <strong>שיתוף (Share)</strong> בתחתית מסך ספארי.
              </p>
              <p className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400">
                  2
                </span>
                גלול מטה ובחר ב-<strong>"הוסף למסך הבית" (Add to Home Screen)</strong>.
              </p>
              <p className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400">
                  3
                </span>
                אשר בלחיצה על <strong>"הוסף"</strong> בפינה העליונה.
              </p>
            </div>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full rounded-2xl bg-sky-600 py-2.5 text-sm font-bold text-white hover:bg-sky-500 transition-all"
            >
              הבנתי, סגור
            </button>
          </div>
        </div>
      )}
    </>
  );
}
