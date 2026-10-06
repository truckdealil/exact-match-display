import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { StatusBadge } from "@/routes/index";
import {
  createRecord,
  fetchRecords,
  isSheetsConfigured,
  purgeMockRecords,
} from "@/services/sheetsService";
import type { InterfaceName, SyncRecord } from "@/lib/storage";
import { audioService } from "@/services/audioService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "מאגר נתונים וגיליון | מרכז שליטה" },
      {
        name: "description",
        content: "טבלה אינטראקטיבית של נתוני Google Sheets עם חיפוש, מיון וייצוא.",
      },
      { property: "og:title", content: "מאגר נתונים וגיליון | מרכז שליטה" },
      {
        property: "og:description",
        content: "טבלה אינטראקטיבית של נתוני Google Sheets עם חיפוש, מיון וייצוא.",
      },
    ],
  }),
  component: DataPage,
});

const INTERFACES: InterfaceName[] = ["Documents", "Locations", "Orders", "AuditLogs"];

function DataPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InterfaceName | "all">("all");
  const [sortDesc, setSortDesc] = useState(true);

  const records = useQuery({ queryKey: ["records"], queryFn: fetchRecords });

  const create = useMutation({
    mutationFn: () =>
      createRecord({
        title: `רשומה חדשה ${new Date().toLocaleTimeString("he-IL")}`,
        interfaceName: filter === "all" ? "Documents" : filter,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["records"] });
      const previous = queryClient.getQueryData<SyncRecord[]>(["records"]) ?? [];
      const optimistic: SyncRecord = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        interfaceName: filter === "all" ? "Documents" : filter,
        driveFolderReference: "…",
        sheetRowId: null,
        status: "pending",
        title: "יוצר רשומה…",
      };
      queryClient.setQueryData<SyncRecord[]>(["records"], [optimistic, ...previous]);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context) queryClient.setQueryData(["records"], context.previous);
      toast.error("יצירת הרשומה נכשלה");
    },
    onSuccess: () => {
      void audioService.play("success");
      toast.success("הרשומה נוצרה ונוספה לתור הסנכרון");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["records"] });
      void queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  const rows = useMemo(() => {
    const all = records.data ?? [];
    return all
      .filter((row) => (filter === "all" ? true : row.interfaceName === filter))
      .filter((row) => row.title.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) =>
        sortDesc ? b.timestamp.localeCompare(a.timestamp) : a.timestamp.localeCompare(b.timestamp),
      );
  }, [records.data, filter, query, sortDesc]);

  const exportCsv = () => {
    const header = "id,timestamp,interfaceName,driveFolderReference,sheetRowId,status,title";
    const body = rows
      .map((row) =>
        [
          row.id,
          row.timestamp,
          row.interfaceName,
          row.driveFolderReference,
          row.sheetRowId ?? "",
          row.status,
          row.title,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "records.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("הקובץ יוצא בהצלחה");
  };

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
        <span className="text-gradient">מאגר נתונים</span> וגיליון
      </h1>

      <GlassCard>
        <SectionTitle
          title="רשומות מסונכרנות"
          subtitle={
            isSheetsConfigured()
              ? "מחובר ל-Google Apps Script"
              : "מצב מקומי — הגדר VITE_GOOGLE_APPS_SCRIPT_URL לחיבור חי"
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-52">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="חיפוש לפי כותרת…"
              className="h-11 w-full rounded-2xl border border-glass-border bg-glass px-4 pe-10 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as InterfaceName | "all")}
            className="h-11 rounded-2xl border border-glass-border bg-glass px-3 text-sm outline-none"
          >
            <option value="all">כל הממשקים</option>
            {INTERFACES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["records"] })}
            disabled={records.isFetching}
            title="סנכרן רשומות מגיליון ענן"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3.5 text-sm font-medium text-primary hover:bg-primary/20 transition-all active:scale-95"
          >
            <RefreshCw className={cn("size-4", records.isFetching && "animate-spin")} />
            סנכרן מהענן
          </button>
          <button
            onClick={async () => {
              const count = await purgeMockRecords();
              void queryClient.invalidateQueries({ queryKey: ["records"] });
              toast.success(`נוקו ${count} נתוני דמה מהזיכרון המקומי`);
            }}
            title="מחק כל נתון דמה מהזיכרון"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-3 text-sm font-medium text-destructive hover:bg-destructive/20 transition-all active:scale-95"
          >
            <Trash2 className="size-4" />
            נקה דמה
          </button>
          <button
            onClick={() => create.mutate()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="size-4" />
            רשומה חדשה
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-glass-border bg-glass px-4 text-sm font-medium transition-transform active:scale-95"
          >
            <Download className="size-4" />
            ייצוא CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">כותרת</th>
                <th className="px-3 py-2 font-medium">ממשק</th>
                <th
                  className="cursor-pointer px-3 py-2 font-medium"
                  onClick={() => setSortDesc((value) => !value)}
                >
                  תאריך {sortDesc ? "↓" : "↑"}
                </th>
                <th className="px-3 py-2 font-medium">שורה בגיליון</th>
                <th className="px-3 py-2 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-glass-border">
                  <td className="px-3 py-3">{row.title}</td>
                  <td className="px-3 py-3 text-muted-foreground">{row.interfaceName}</td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {new Date(row.timestamp).toLocaleString("he-IL")}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{row.sheetRowId ?? "—"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              לא נמצאו רשומות תואמות.
            </p>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
