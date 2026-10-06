import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Edit3, Eraser, PenTool, Sparkles, User, X } from "lucide-react";
import { toast } from "sonner";
import { audioService } from "@/services/audioService";
import type { ScheduleOrder } from "@/services/scheduleService";

interface SpenSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ScheduleOrder | null;
  onSaveSignature: (signatureData: {
    orderId: string;
    signatureBase64: string;
    siteManagerName: string;
    timestamp: string;
  }) => void;
}

export function SpenSignatureModal({
  isOpen,
  onClose,
  order,
  onSaveSignature,
}: SpenSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [siteManagerName, setSiteManagerName] = useState(order?.customer_name || "מנהל אתר");
  const [penColor, setPenColor] = useState<"blue" | "dark" | "emerald">("blue");
  const [penSize, setPenSize] = useState<number>(3);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (order) {
      setSiteManagerName(order.customer_name);
    }
  }, [order]);

  // Set up canvas with high-DPI scaling for Samsung S23 Ultra / Note 23 (1440p)
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle =
      penColor === "blue" ? "#0284c7" : penColor === "emerald" ? "#10b981" : "#e2e8f0";
    ctx.lineWidth = penSize;

    // Draw subtle signing baseline
    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, rect.height - 40);
    ctx.lineTo(rect.width - 30, rect.height - 40);
    ctx.stroke();
    ctx.restore();
  }, [penColor, penSize]);

  useEffect(() => {
    if (isOpen) {
      setHasDrawn(false);
      lastPointRef.current = null;
      setTimeout(initCanvas, 150);
    }
  }, [isOpen, initCanvas]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = getCoordinates(e);
    lastPointRef.current = { x, y };
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPointRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y, pressure } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(x, y);

    // Dynamic S-Pen pressure thickness simulation
    const strokeWidth = penSize * (0.6 + pressure * 0.8);
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle =
      penColor === "blue" ? "#0284c7" : penColor === "emerald" ? "#10b981" : "#e2e8f0";
    ctx.stroke();

    lastPointRef.current = { x, y };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    initCanvas();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleSave = () => {
    if (!hasDrawn || !canvasRef.current || !order) {
      toast.warning("יש לחתום על המשטח לפני האישור.");
      return;
    }

    const signatureBase64 = canvasRef.current.toDataURL("image/png");
    const timestamp = new Date().toISOString();

    onSaveSignature({
      orderId: order.order_id,
      signatureBase64,
      siteManagerName: siteManagerName.trim() || order.customer_name,
      timestamp,
    });

    // Samsung haptic pulse
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([20, 30]);
    }
    void audioService.play("success");

    toast.success("חתימת שטח (S-Pen) נקלטה בהצלחה! ✍️", {
      description: `החתימה הוצמדה לתעודת משלוח ${order.order_id} של ${siteManagerName}`,
    });

    onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="relative flex flex-col w-full max-w-lg rounded-3xl border border-glass-border bg-[#0a0f1d] p-5 shadow-2xl text-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-glass-border/70 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-2xl bg-sky-500/20 text-sky-400">
                <PenTool className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">חתימת שטח דיגיטלית (S-Pen)</h3>
                  <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-400">
                    S23 Ultra / Note
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  הזמנה #{order.order_id} · {order.customer_name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-glass hover:text-foreground active:scale-95 touch-manipulation min-h-[44px]"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Site Manager Name Field */}
          <div className="mt-3.5 space-y-1">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="size-3.5 text-sky-400" />
              <span>שם מקבל המשלוח / מנהל האתר:</span>
            </label>
            <input
              type="text"
              value={siteManagerName}
              onChange={(e) => setSiteManagerName(e.target.value)}
              placeholder="שם המקבל..."
              className="w-full rounded-xl border border-glass-border bg-glass/60 px-3.5 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-sky-500/40 min-h-[44px] touch-manipulation"
            />
          </div>

          {/* S-Pen Tools Toolbar */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">צבע עט:</span>
              <button
                type="button"
                onClick={() => setPenColor("blue")}
                className={`size-6 rounded-full bg-sky-500 ring-2 transition-transform ${penColor === "blue" ? "ring-white scale-110" : "ring-transparent opacity-60"}`}
              />
              <button
                type="button"
                onClick={() => setPenColor("dark")}
                className={`size-6 rounded-full bg-slate-200 ring-2 transition-transform ${penColor === "dark" ? "ring-white scale-110" : "ring-transparent opacity-60"}`}
              />
              <button
                type="button"
                onClick={() => setPenColor("emerald")}
                className={`size-6 rounded-full bg-emerald-500 ring-2 transition-transform ${penColor === "emerald" ? "ring-white scale-110" : "ring-transparent opacity-60"}`}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">עובי:</span>
              {[2, 3, 5].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPenSize(size)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${penSize === size ? "bg-primary text-primary-foreground" : "bg-glass text-muted-foreground"}`}
                >
                  {size}px
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 active:scale-95 touch-manipulation py-1 px-2"
            >
              <Eraser className="size-3.5" />
              נקה
            </button>
          </div>

          {/* S-Pen High-DPI Canvas Area */}
          <div className="relative mt-2.5 h-56 w-full overflow-hidden rounded-2xl border-2 border-dashed border-sky-500/30 bg-[#070a11] shadow-inner">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="h-full w-full cursor-crosshair touch-none"
            />
            {!hasDrawn && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/60">
                <Edit3 className="size-8 stroke-[1.2]" />
                <p className="text-xs">חתום כאן באמצעות עט S-Pen או מגע ישיר</p>
                <p className="text-[10px] opacity-75">מותאם רגישות לחץ ודיוק 1440p</p>
              </div>
            )}
          </div>

          {/* Order Details Brief Footer */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground bg-glass/40 rounded-xl p-2.5">
            <span className="truncate max-w-[240px]">📍 יעד: {order.address}</span>
            <span>🚛 {order.driver.split(" ")[0]}</span>
          </div>

          {/* Modal Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-glass-border bg-glass py-3 text-sm font-semibold text-muted-foreground hover:bg-glass/80 active:scale-95 min-h-[48px] touch-manipulation"
            >
              ביטול
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 min-h-[48px] touch-manipulation"
            >
              <Check className="size-4" />
              <span>אשר חתימה והצמד</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
