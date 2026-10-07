import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  FolderOpen,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
  CheckCircle2,
  Globe,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { fetchRecords } from "@/services/sheetsService";
import {
  drainQueue,
  readAll,
  type AuditLog,
  type InterfaceName,
  type PendingAction,
} from "@/lib/storage";
import { generateSimulatorPingPongReply } from "@/services/noaBrainService";
import { playMobileChime } from "@/services/audioService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/storage")({
  head: () => ({
    meta: [
      { title: "סימולטור פינג-פונג וארכיון דרייב | נועה AI" },
      {
        name: "description",
        content:
          "סימולטור פינג-פונג תגובות מהירות של נועה AI, תמיכה בשפה הערבית, וניהול ארכיון תיקיות Google Drive.",
      },
      { property: "og:title", content: "סימולטור פינג-פונג וארכיון דרייב | נועה AI" },
      {
        property: "og:description",
        content:
          "סימולטור פינג-פונג תגובות מהירות של נועה AI, תמיכה בשפה הערבית, וניהול ארכיון תיקיות Google Drive.",
      },
    ],
  }),
  component: StoragePage,
});

const FOLDERS: InterfaceName[] = ["Documents", "Locations", "Orders", "AuditLogs"];

interface SimulatorMessage {
  id: string;
  sender: "user" | "noa";
  text: string;
  timestamp: string;
  sentencesCount?: number;
  hasReturnBall?: boolean;
}

function StoragePage() {
  const queryClient = useQueryClient();
  const records = useQuery({ queryKey: ["records"], queryFn: fetchRecords });
  const queue = useQuery({ queryKey: ["queue"], queryFn: () => readAll<PendingAction>("queue") });
  const logs = useQuery({ queryKey: ["logs"], queryFn: () => readAll<AuditLog>("logs") });

  const rows = records.data ?? [];

  // Simulator State
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<SimulatorMessage[]>([
    {
      id: "init-1",
      sender: "user",
      text: "נועה, מתי חכמת יוצא לרעננה?",
      timestamp: "07:02",
    },
    {
      id: "init-2",
      sender: "noa",
      text: "חכמת מרצדס מנוף (615-41-002) מעמיס במחסן 4 החרש ויוצא ב-07:00 בדיוק לעקיפת פקקי איילון. האם להעביר אליו את תעודת המשלוח החתומה לוואטסאפ?",
      timestamp: "07:02",
      sentencesCount: 2,
      hasReturnBall: true,
    },
  ]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: SimulatorMessage = {
      id: `msg-${Date.now()}-u`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    };

    const replyText = generateSimulatorPingPongReply(text);
    const sentences = replyText.split(/[.?!]\s+/).filter(Boolean).length;
    const hasReturnBall =
      replyText.includes("?") || replyText.includes("האם") || replyText.includes("هل");

    const noaMsg: SimulatorMessage = {
      id: `msg-${Date.now()}-n`,
      sender: "noa",
      text: replyText,
      timestamp: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      sentencesCount: Math.min(sentences, 2),
      hasReturnBall,
    };

    setMessages((prev) => [...prev, userMsg, noaMsg]);
    setInputText("");
    playMobileChime();
  };

  const sync = async () => {
    const online = typeof navigator !== "undefined" && navigator.onLine;
    if (!online) {
      toast.error("אין חיבור — התור יסונכרן אוטומטית בחזרה לרשת");
      return;
    }
    const count = await drainQueue(async () => true);
    await queryClient.invalidateQueries({ queryKey: ["queue"] });
    toast.success(count ? `סונכרנו ${count} פעולות` : "אין פעולות ממתינות");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          <span className="text-gradient">סימולטור פינג-פונג</span> & ארכיון Drive
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          בדיקת חוקי הפינג-פונג (עד 2 משפטים + כדור חוזר), מענה בערבית, ארכיון ענן ותור סנכרון מקומי
        </p>
      </div>

      {/* Ping-Pong Simulator Card */}
      <GlassCard glow className="p-5 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-sky-500/20 text-sky-400">
              <MessageSquare className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                סימולטור דיאלוג פינג-פונג נועה AI (Live Chat)
              </h2>
              <p className="text-xs text-slate-400">
                נאמן לכלל DNA 17: מענה תמציתי ומקצועי עד 2 משפטים + שאלת כדור חוזר
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playMobileChime();
                toast.info("צליל צלצול הושמע");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-sky-400 hover:text-sky-300"
            >
              <Volume2 className="size-3.5" />
              <span>בדוק צליל</span>
            </button>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              מנוע מוכן
            </span>
          </div>
        </div>

        {/* Quick Test Presets */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="self-center text-[11px] text-slate-400 ml-1">תרחישי מבחן:</span>
          <button
            onClick={() => handleSendMessage("מה לירן רוכש תמיד?")}
            className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-300 hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
          >
            👤 מה לירן רוכש?
          </button>
          <button
            onClick={() => handleSendMessage("מתי חכמת יוצא ואיזה משאית?")}
            className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-300 hover:bg-sky-500/20 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
          >
            🚚 מתי חכמת יוצא?
          </button>
          <button
            onClick={() => handleSendMessage("1")}
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            ✅ אישור 1 (ראמי)
          </button>
          <button
            onClick={() => handleSendMessage("הוראת מנכ״ל הראל אידלסון")}
            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            🚨 פרוטוקול מנכ״ל
          </button>
          <button
            onClick={() => handleSendMessage("كم سعر الرمل اليوم وين الشاحنة؟")}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <Globe className="inline size-3 mr-1" />
            ערבית (رد باللغة العربية)
          </button>
          <button
            onClick={() => handleSendMessage("מה פתוח בקריית אונו?")}
            className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-300 hover:bg-sky-500/20 hover:text-sky-400 transition-colors"
          >
            💰 גביית מזומן 1,817 ₪
          </button>
          <button
            onClick={() => handleSendMessage("איך עובדים הפקדונות על בלות ומשטחים?")}
            className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-300 hover:bg-sky-500/20 hover:text-sky-400 transition-colors"
          >
            🔄 חוק פקדונות 1:1
          </button>
        </div>

        {/* Message Log */}
        <div className="mt-4 max-h-80 overflow-y-auto space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col max-w-xl rounded-2xl p-3 text-xs space-y-1 transition-all",
                m.sender === "user"
                  ? "mr-auto bg-slate-800/90 text-slate-200 border border-slate-700"
                  : "ml-auto bg-sky-950/40 text-slate-100 border border-sky-500/30 shadow-md",
              )}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span className="font-bold flex items-center gap-1">
                  {m.sender === "user" ? "🧑 פניית שטח / לקוח" : "🤖 נועה AI (מענה פינג-פונג)"}
                </span>
                <span>{m.timestamp}</span>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{m.text}</p>
              {m.sender === "noa" && (
                <div className="flex items-center gap-2 pt-1 border-t border-sky-500/10 text-[10px]">
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="size-3" />
                    משפטים: {m.sentencesCount ?? 2} (≤ 2)
                  </span>
                  {m.hasReturnBall && (
                    <span className="rounded bg-sky-500/20 text-sky-300 px-1.5 py-0.2">
                      כדור חוזר פעיל 🏓
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            placeholder="הקלד שאלה או בקשה לבדיקת פינג-פונג של נועה AI..."
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-sky-500/40"
          />
          <button
            onClick={() => handleSendMessage()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-600/30 hover:bg-sky-500 transition-all active:scale-95"
          >
            <Send className="size-3.5 rtl:-scale-x-100" />
            <span>שלח</span>
          </button>
        </div>
      </GlassCard>

      {/* Drive Folders Overview */}
      <div>
        <SectionTitle title="תיקיות Google Drive מבצעיות" subtitle="מיפוי תיקיות לקוחות ומסמכים" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FOLDERS.map((folder, index) => {
            const items = rows.filter((row) => row.interfaceName === folder);
            return (
              <GlassCard
                key={`${folder}-${index}`}
                delay={index * 0.05}
                className="p-4 border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
                    <Folder className="size-5" />
                  </span>
                  <span className="text-xl font-bold font-mono text-slate-100">{items.length}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-200">{folder}</p>
                <p className="text-[11px] text-slate-400 font-mono">Drive/{folder}</p>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Sync Queue and Recent Archive Files */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard delay={0.2} className="border-slate-800 p-4">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <SectionTitle title="תור פעולות מקומי" subtitle="פעולות שממתינות לסנכרון עם הגיליון" />
            <button
              onClick={() => void sync()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-all active:scale-95"
            >
              <RefreshCw className="size-3.5" />
              סנכרן תור
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {(queue.data ?? []).map((action, idx) => (
              <div
                key={`${action.id}-${idx}`}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs"
              >
                <p className="font-semibold text-slate-200">
                  {action.type === "create" ? "יצירה" : "עדכון"} · {action.recordId}
                </p>
                <p className="text-[11px] text-slate-400">
                  {new Date(action.createdAt).toLocaleString("he-IL")}
                </p>
              </div>
            ))}
            {(queue.data ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                התור ריק — כל הפעולות מסונכרנות עם הענן.
              </p>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard delay={0.25} className="border-slate-800 p-4">
          <SectionTitle
            title="קבצים אחרונים בארכיון"
            subtitle="מיפוי רשומה ↔ תיקיית Drive ↔ שורת גיליון"
          />
          <div className="mt-3 space-y-2">
            {rows.slice(0, 6).map((row, idx) => (
              <div
                key={`${row.id}-${idx}`}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs"
              >
                <FolderOpen className="size-4 shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-200">{row.title}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {row.driveFolderReference} · שורה {row.sheetRowId ?? "—"}
                  </p>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-xs text-slate-400 py-3 text-center">אין קבצים להצגה כרגע.</p>
            )}
          </div>
          {(logs.data ?? []).length > 0 ? (
            <p className="mt-3 text-[11px] text-slate-400">
              {logs.data?.length} רשומות יומן מקומיות בזיכרון.
            </p>
          ) : null}
        </GlassCard>
      </div>
    </div>
  );
}
