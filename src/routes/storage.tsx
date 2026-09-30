import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Folder, FolderOpen, RefreshCw } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/storage")({
  head: () => ({
    meta: [
      { title: "מאגר היסטורי ודרייב | מרכז שליטה" },
      {
        name: "description",
        content: "תצוגת תיקיות Drive לכל ממשק, קבצים בארכיון ותור פעולות מקומי.",
      },
      { property: "og:title", content: "מאגר היסטורי ודרייב | מרכז שליטה" },
      {
        property: "og:description",
        content: "תצוגת תיקיות Drive לכל ממשק, קבצים בארכיון ותור פעולות מקומי.",
      },
    ],
  }),
  component: StoragePage,
});

const FOLDERS: InterfaceName[] = ["Documents", "Locations", "Orders", "AuditLogs"];

function StoragePage() {
  const queryClient = useQueryClient();
  const records = useQuery({ queryKey: ["records"], queryFn: fetchRecords });
  const queue = useQuery({ queryKey: ["queue"], queryFn: () => readAll<PendingAction>("queue") });
  const logs = useQuery({ queryKey: ["logs"], queryFn: () => readAll<AuditLog>("logs") });

  const rows = records.data ?? [];

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
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
        <span className="text-gradient">מאגר היסטורי</span> ודרייב
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {FOLDERS.map((folder, index) => {
          const items = rows.filter((row) => row.interfaceName === folder);
          return (
            <GlassCard key={folder} delay={index * 0.05}>
              <span className="grid size-11 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Folder className="size-5" />
              </span>
              <p className="mt-3 font-semibold">{folder}</p>
              <p className="text-xs text-muted-foreground">Drive/{folder}</p>
              <p className="mt-3 text-2xl font-bold tabular-nums">{items.length}</p>
              <p className="text-xs text-muted-foreground">קבצים בארכיון</p>
            </GlassCard>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GlassCard delay={0.2}>
          <div className="flex items-start justify-between">
            <SectionTitle title="תור פעולות מקומי" subtitle="פעולות שממתינות לסנכרון עם הגיליון" />
            <button
              onClick={() => void sync()}
              className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-xs font-medium transition-transform active:scale-95"
            >
              <RefreshCw className="size-3.5" />
              סנכרן
            </button>
          </div>
          <div className="space-y-2">
            {(queue.data ?? []).map((action) => (
              <div
                key={action.id}
                className="rounded-2xl border border-glass-border bg-glass px-4 py-3 text-sm"
              >
                <p className="font-medium">
                  {action.type === "create" ? "יצירה" : "עדכון"} · {action.recordId}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(action.createdAt).toLocaleString("he-IL")}
                </p>
              </div>
            ))}
            {(queue.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">התור ריק — הכל מסונכרן.</p>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard delay={0.25}>
          <SectionTitle
            title="קבצים אחרונים בארכיון"
            subtitle="מיפוי רשומה ↔ תיקיית Drive ↔ שורת גיליון"
          />
          <div className="space-y-2">
            {rows.slice(0, 7).map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass px-4 py-3"
              >
                <FolderOpen className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {row.driveFolderReference} · שורה {row.sheetRowId ?? "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {(logs.data ?? []).length > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {logs.data?.length} רשומות יומן מקומיות.
            </p>
          ) : null}
        </GlassCard>
      </div>
    </div>
  );
}
