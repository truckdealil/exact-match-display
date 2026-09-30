import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Clock,
  Crosshair,
  FolderSync,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import { GlassCard, SectionTitle } from "@/components/glass-card";
import { useGeolocation } from "@/hooks/useGeolocation";
import { fetchRecords } from "@/services/sheetsService";
import { readAll, type PendingAction } from "@/lib/storage";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "לוח בקרה | מרכז שליטה" },
      {
        name: "description",
        content: "תצוגת בנטו חיה של סטטוס המערכת, סטטיסטיקות, פעילות אחרונה ומיקום נוכחי.",
      },
      { property: "og:title", content: "לוח בקרה | מרכז שליטה" },
      {
        property: "og:description",
        content: "תצוגת בנטו חיה של סטטוס המערכת, סטטיסטיקות, פעילות אחרונה ומיקום נוכחי.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { online } = useSettings();
  const { position, status, error, request } = useGeolocation();

  const records = useQuery({ queryKey: ["records"], queryFn: fetchRecords });
  const queue = useQuery({ queryKey: ["queue"], queryFn: () => readAll<PendingAction>("queue") });

  const rows = records.data ?? [];
  const synced = rows.filter((row) => row.status === "synced").length;
  const pending = rows.filter((row) => row.status === "pending").length;
  const failed = rows.filter((row) => row.status === "failed").length;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="mb-6"
      >
        <p className="text-sm text-muted-foreground">ברוך הבא</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          <span className="text-gradient">לוח בקרה</span> תפעולי
        </h1>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="מסונכרן" value={synced} tone="text-success" delay={0} />
        <StatCard icon={Clock} label="ממתין" value={pending} tone="text-warning" delay={0.05} />
        <StatCard icon={TriangleAlert} label="כשלים" value={failed} tone="text-destructive" delay={0.1} />
        <StatCard
          icon={FolderSync}
          label="בתור מקומי"
          value={queue.data?.length ?? 0}
          tone="text-primary"
          delay={0.15}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <GlassCard delay={0.2} className="lg:col-span-2">
          <SectionTitle title="פעילות אחרונה" subtitle="רשומות שהתקבלו או סונכרנו לאחרונה" />
          <div className="space-y-2">
            {rows.slice(0, 6).map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass px-4 py-3"
              >
                <Activity className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.interfaceName} · {new Date(row.timestamp).toLocaleString("he-IL")}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>
            ))}
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין עדיין פעילות להצגה.</p>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard delay={0.25} glow>
          <SectionTitle title="מיקום נוכחי" subtitle="איכון GPS באישור המשתמש" />
          <div className="rounded-2xl border border-glass-border bg-glass p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                <MapPin className="size-5" />
              </span>
              <div className="text-sm">
                {position ? (
                  <>
                    <p className="font-medium">
                      {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      דיוק ±{Math.round(position.accuracy)} מ׳ ·{" "}
                      {new Date(position.timestamp).toLocaleTimeString("he-IL")}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    {status === "denied"
                      ? (error ?? "ההרשאה נדחתה")
                      : status === "unsupported"
                        ? "הדפדפן אינו תומך באיכון"
                        : "טרם נקלט מיקום"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={request}
              disabled={status === "requesting"}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform active:scale-95 disabled:opacity-60"
            >
              <Crosshair className="size-4" />
              {status === "requesting" ? "מאתר…" : "קלוט מיקום"}
            </button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {online ? "החיבור פעיל — סנכרון מיידי." : "אין חיבור — הפעולות יישמרו מקומית ויסונכרנו אוטומטית."}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  delay,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone: string;
  delay: number;
}) {
  return (
    <GlassCard delay={delay} className="p-4">
      <Icon className={`size-5 ${tone}`} />
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </GlassCard>
  );
}

export function StatusBadge({ status }: { status: "pending" | "synced" | "failed" }) {
  const map = {
    synced: { label: "מסונכרן", cls: "text-success" },
    pending: { label: "ממתין", cls: "text-warning" },
    failed: { label: "נכשל", cls: "text-destructive" },
  } as const;
  return (
    <span
      className={`shrink-0 rounded-full border border-glass-border bg-glass px-2.5 py-1 text-[11px] ${map[status].cls}`}
    >
      {map[status].label}
    </span>
  );
}
