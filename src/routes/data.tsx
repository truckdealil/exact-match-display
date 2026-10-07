import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  Cpu,
  Download,
  Edit2,
  FileJson,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Table,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { StatusBadge } from "@/routes/index";
import {
  clearAllRecords,
  createRecord,
  fetchRecords,
  isSheetsConfigured,
  purgeMockRecords,
} from "@/services/sheetsService";
import {
  addDnaRule,
  deleteDnaRule,
  exportRulesAsJsonString,
  getDnaRules,
  resetToDefaultDnaRules,
  updateDnaRule,
  type NoaDnaRule,
  type RuleCategory,
} from "@/services/noaBrainService";
import type { InterfaceName, SyncRecord } from "@/lib/storage";
import { audioService, playMobileChime } from "@/services/audioService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "סטודיו אימון מוח נועה AI | DNA Studio" },
      {
        name: "description",
        content:
          "סטודיו אימון מוח נועה AI: ניהול ועריכת 21 כללי הברזל הלוגיסטיים, צריבה בזיכרון וסנכרון ענן.",
      },
      { property: "og:title", content: "סטודיו אימון מוח נועה AI | DNA Studio" },
      {
        property: "og:description",
        content:
          "סטודיו אימון מוח נועה AI: ניהול ועריכת 21 כללי הברזל הלוגיסטיים, צריבה בזיכרון וסנכרון ענן.",
      },
    ],
  }),
  component: DataPage,
});

const CATEGORIES: RuleCategory[] = [
  "פקדונות 1:1",
  "נהגים ושינוע",
  "מחסנים ומגרשים",
  "תמחור והזמנות",
  "סגנון תקשורת ופינג-פונג",
];

const INTERFACES: InterfaceName[] = ["Documents", "Locations", "Orders", "AuditLogs"];

function DataPage() {
  const queryClient = useQueryClient();

  // Rules state
  const [rules, setRules] = useState<NoaDnaRule[]>(getDnaRules());
  const [selectedCategory, setSelectedCategory] = useState<RuleCategory | "הכל">("הכל");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Add Form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<RuleCategory>("פקדונות 1:1");
  const [newTitle, setNewTitle] = useState("");
  const [newInstruction, setNewInstruction] = useState("");
  const [newPriority, setNewPriority] = useState<NoaDnaRule["priority"]>("גבוה");
  const [newExample, setNewExample] = useState("");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [editPriority, setEditPriority] = useState<NoaDnaRule["priority"]>("גבוה");
  const [editCategory, setEditCategory] = useState<RuleCategory>("פקדונות 1:1");

  // Google Sheets Records state
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InterfaceName | "all">("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [showSheetsArchive, setShowSheetsArchive] = useState(false);

  const records = useQuery({ queryKey: ["records"], queryFn: fetchRecords });

  const refreshRules = () => {
    setRules(getDnaRules());
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstruction.trim()) {
      toast.error("נא למלא כותרת והנחיה לכלל");
      return;
    }

    addDnaRule({
      category: newCategory,
      title: newTitle.trim(),
      instruction: newInstruction.trim(),
      priority: newPriority,
      example: newExample.trim() || undefined,
      active: true,
    });

    setNewTitle("");
    setNewInstruction("");
    setNewExample("");
    setIsAddOpen(false);
    refreshRules();
  };

  const startEdit = (rule: NoaDnaRule) => {
    setEditingId(rule.id);
    setEditTitle(rule.title);
    setEditInstruction(rule.instruction);
    setEditPriority(rule.priority);
    setEditCategory(rule.category);
  };

  const saveEdit = (id: string) => {
    if (!editTitle.trim() || !editInstruction.trim()) {
      toast.error("הכותרת וההנחיה אינן יכולות להיות ריקות");
      return;
    }
    updateDnaRule(id, {
      title: editTitle.trim(),
      instruction: editInstruction.trim(),
      priority: editPriority,
      category: editCategory,
    });
    setEditingId(null);
    refreshRules();
  };

  const handleDeleteRule = (id: string, title: string) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את הכלל "${title}" מזיכרון נועה?`)) {
      deleteDnaRule(id);
      refreshRules();
    }
  };

  const handleResetDefaults = () => {
    if (confirm("האם לאפס את כללי ה-DNA ל-21 כללי הברזל המקוריים של סבן?")) {
      resetToDefaultDnaRules();
      refreshRules();
    }
  };

  const handleExportJson = () => {
    const json = exportRulesAsJsonString();
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "noa-agent.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("קובץ noa-agent.json יוצא בהצלחה!");
  };

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchCat = selectedCategory === "הכל" || r.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.instruction.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [rules, selectedCategory, searchQuery]);

  // Sheets Records logic
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
      playMobileChime();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-sky-400">
            ח. סבן | SabanOS Brain Management
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl text-slate-100">
            סטודיו אימון המוח <span className="text-sky-400">Knowledge DNA</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ניהול ועריכת 21 כללי הברזל, הצלבת קומקס ⇄ וואטסאפ, צריבה בזיכרון וסנכרון ענן
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-sky-600/30 hover:bg-sky-500 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            <span>כלל חדש (➕)</span>
          </button>
          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
            title="ייצוא קובץ noa-agent.json"
          >
            <FileJson className="size-4 text-sky-400" />
            <span>ייצוא JSON</span>
          </button>
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:border-rose-500/40 active:scale-95 transition-all"
            title="שחזור 21 כללי הברזל המקוריים"
          >
            <RotateCcw className="size-3.5" />
            <span>איפוס לברירת מחדל</span>
          </button>
        </div>
      </div>

      {/* Add New Rule Modal / Drawer */}
      {isAddOpen && (
        <GlassCard glow className="p-5 border-sky-500/40 bg-slate-900/90">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-sky-500/20 text-sky-400">
                <Plus className="size-4" />
              </span>
              <h2 className="text-base font-bold text-slate-100">צריבת כלל DNA חדש במוח נועה AI</h2>
            </div>
            <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">קטגוריה:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as RuleCategory)}
                  className="w-full h-10 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-200 outline-none focus:border-sky-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">עדיפות כלל:</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as NoaDnaRule["priority"])}
                  className="w-full h-10 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-200 outline-none focus:border-sky-500"
                >
                  <option value="קריטי">קריטי (ברזל)</option>
                  <option value="גבוה">גבוה</option>
                  <option value="רגיל">רגיל</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">כותרת הכלל:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="לדוגמה: חוק איסוף פקדונות..."
                  className="w-full h-10 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-200 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                הנחיית הברזל (מה על נועה לבצע/לאכוף):
              </label>
              <textarea
                rows={3}
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                placeholder="הגדר את חוק הברזל, מק״טים, נהגים מורשים או סגנון מענה..."
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-slate-200 outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                דוגמה מעשית מהשטח (אופציונלי):
              </label>
              <input
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                placeholder="הוזמנו 10 שקים -> חיוב 10 פקדון 60002"
                className="w-full h-10 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-200 outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 px-5 py-2 font-bold text-white shadow-lg shadow-sky-600/30 hover:brightness-110 active:scale-95 transition-all"
              >
                <Sparkles className="size-4" />
                <span>צרוב בזיכרון של נועה</span>
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Filter and Search Bar */}
      <GlassCard className="p-4 border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setSelectedCategory("הכל")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                selectedCategory === "הכל"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-white",
              )}
            >
              הכל ({rules.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = rules.filter((r) => r.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                    selectedCategory === cat
                      ? "bg-sky-600 text-white shadow-sm"
                      : "bg-slate-900 text-slate-400 hover:text-white",
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש כלל או מק״ט..."
              className="h-9 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 pe-9 text-xs text-slate-200 outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* Rules List */}
      <div className="grid gap-3 md:grid-cols-2">
        {filteredRules.map((rule, idx) => {
          const isEditing = editingId === rule.id;

          return (
            <GlassCard
              key={`${rule.id}-${idx}`}
              className={cn(
                "p-4 border transition-all flex flex-col justify-between",
                rule.priority === "קריטי"
                  ? "border-rose-500/30 bg-slate-900/80 hover:border-rose-500/60"
                  : "border-slate-800 bg-slate-900/60 hover:border-sky-500/40",
              )}
            >
              {isEditing ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-sky-400">עריכת כלל DNA</span>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      קטגוריה ועדיפות:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as RuleCategory)}
                        className="h-8 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as NoaDnaRule["priority"])}
                        className="h-8 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200"
                      >
                        <option value="קריטי">קריטי</option>
                        <option value="גבוה">גבוה</option>
                        <option value="רגיל">רגיל</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">כותרת:</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">הנחיה:</label>
                    <textarea
                      rows={3}
                      value={editInstruction}
                      onChange={(e) => setEditInstruction(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-slate-200"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-slate-700 px-3 py-1 text-slate-300"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={() => saveEdit(rule.id)}
                      className="rounded-lg bg-sky-600 px-3 py-1 font-bold text-white hover:bg-sky-500"
                    >
                      שמור שינויים
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold border",
                            rule.priority === "קריטי"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : rule.priority === "גבוה"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-sky-500/20 text-sky-300 border-sky-500/40",
                          )}
                        >
                          {rule.priority}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {rule.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{rule.title}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(rule)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors"
                        title="ערוך כלל"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id, rule.title)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="מחק כלל"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{rule.instruction}</p>

                  {rule.example && (
                    <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-2.5 text-[11px] text-slate-400">
                      <span className="text-sky-400 font-bold ml-1">💡 דוגמה מהשטח:</span>
                      {rule.example}
                    </div>
                  )}

                  <div className="border-t border-slate-800/70 pt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>עודכן: {rule.updatedAt}</span>
                    <span className="text-emerald-400 font-semibold">● פעיל במוח נועה</span>
                  </div>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {filteredRules.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
          לא נמצאו כללי DNA התואמים את החיפוש.
        </div>
      )}

      {/* Secondary Collapsible: Google Sheets Sync Records & CSV Export */}
      <GlassCard className="p-4 border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="size-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-200">
              מאגר רשומות וסנכרון Sheets ({rows.length} רשומות)
            </h3>
          </div>
          <button
            onClick={() => setShowSheetsArchive((v) => !v)}
            className="text-xs font-semibold text-sky-400 hover:underline"
          >
            {showSheetsArchive ? "הסתר מאגר ▲" : "הצג מאגר רשומות ▼"}
          </button>
        </div>

        {showSheetsArchive && (
          <div className="mt-4 space-y-4 pt-3 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש ברשומות Sheets…"
                className="h-9 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-200 outline-none"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as InterfaceName | "all")}
                className="h-9 rounded-xl border border-slate-700 bg-slate-900 px-3 text-slate-200 outline-none"
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
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 font-medium text-sky-400 hover:bg-sky-500/20"
              >
                <RefreshCw className={cn("size-3.5", records.isFetching && "animate-spin")} />
                רענן
              </button>
              <button
                onClick={async () => {
                  const count = await purgeMockRecords();
                  void queryClient.invalidateQueries({ queryKey: ["records"] });
                  toast.success(`נוקו ${count} נתוני דמה מהזיכרון`);
                }}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 text-rose-400"
              >
                <Trash2 className="size-3.5" />
                נקה דמה
              </button>
              <button
                onClick={exportCsv}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-200"
              >
                <Download className="size-3.5" />
                ייצוא CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800">
                    <th className="px-3 py-2">כותרת</th>
                    <th className="px-3 py-2">ממשק</th>
                    <th className="px-3 py-2">תאריך</th>
                    <th className="px-3 py-2">שורה</th>
                    <th className="px-3 py-2">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 15).map((row, idx) => (
                    <tr key={`${row.id}-${idx}`} className="border-b border-slate-800/50">
                      <td className="px-3 py-2 text-slate-200 font-medium">{row.title}</td>
                      <td className="px-3 py-2 text-slate-400">{row.interfaceName}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(row.timestamp).toLocaleTimeString("he-IL")}
                      </td>
                      <td className="px-3 py-2 text-slate-400 font-mono">
                        {row.sheetRowId ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
