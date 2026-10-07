import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Gauge,
  Layers,
  PieChart as PieIcon,
  RefreshCw,
  TrendingUp,
  Truck,
  Warehouse,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { type ScheduleOrder } from "@/services/scheduleService";
import { cn } from "@/lib/utils";

interface LogisticsAnalyticsDashboardProps {
  orders: ScheduleOrder[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const STATUS_COLORS = {
  delivered: "#10b981", // Emerald 500
  enRoute: "#0284c7", // Sky 600
  pending: "#f59e0b", // Amber 500
  issue: "#f43f5e", // Rose 500
};

export function LogisticsAnalyticsDashboard({
  orders,
  onRefresh,
  isRefreshing = false,
}: LogisticsAnalyticsDashboardProps) {
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [activeChartTab, setActiveChartTab] = useState<"overview" | "rounds" | "fleet">("overview");

  // 1. Filter orders based on user selection
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchDriver =
        selectedDriver === "all" ||
        (selectedDriver === "hikmat" && order.driver.includes("חכמת")) ||
        (selectedDriver === "ali" && order.driver.includes("עלי")) ||
        (selectedDriver === "other" &&
          !order.driver.includes("חכמת") &&
          !order.driver.includes("עלי"));

      const matchWarehouse =
        selectedWarehouse === "all" ||
        (selectedWarehouse === "harash" && order.warehouse.includes("החרש")) ||
        (selectedWarehouse === "talmid" && order.warehouse.includes("התלמיד"));

      return matchDriver && matchWarehouse;
    });
  }, [orders, selectedDriver, selectedWarehouse]);

  // 2. High-level Shift Metrics
  const metrics = useMemo(() => {
    const total = filteredOrders.length;
    let delivered = 0;
    let enRoute = 0;
    let pending = 0;
    let signedDeliveryNotes = 0;

    filteredOrders.forEach((o) => {
      const st = o.status || "";
      if (st.includes("סופק")) {
        delivered++;
      } else if (st.includes("יצא לדרך")) {
        enRoute++;
      } else {
        pending++;
      }

      if (o.has_delivery_note || Boolean(o.signature_base64)) {
        signedDeliveryNotes++;
      }
    });

    const completionRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const inProgressRate = total > 0 ? Math.round(((delivered + enRoute) / total) * 100) : 0;

    return {
      total,
      delivered,
      enRoute,
      pending,
      signedDeliveryNotes,
      completionRate,
      inProgressRate,
    };
  }, [filteredOrders]);

  // 3. Status Pie Chart Data
  const statusPieData = useMemo(() => {
    const data = [
      { name: "סופק בהצלחה", value: metrics.delivered, color: STATUS_COLORS.delivered },
      { name: "בשינוע (יצא לדרך)", value: metrics.enRoute, color: STATUS_COLORS.enRoute },
      { name: "ממתין להעמסה", value: metrics.pending, color: STATUS_COLORS.pending },
    ];
    return data.filter((d) => d.value > 0);
  }, [metrics]);

  // 4. Shift Rounds Timeline Data (סבבי חלוקה)
  const roundsTimelineData = useMemo(() => {
    // Define canonical shift rounds
    const roundsMap: Record<
      string,
      { roundName: string; time: string; delivered: number; enRoute: number; pending: number }
    > = {
      "07:00": { roundName: "סבב 1", time: "07:00", delivered: 0, enRoute: 0, pending: 0 },
      "09:30": { roundName: "סבב 2", time: "09:30", delivered: 0, enRoute: 0, pending: 0 },
      "12:00": { roundName: "סבב 3", time: "12:00", delivered: 0, enRoute: 0, pending: 0 },
      "14:30": { roundName: "סבב 4", time: "14:30", delivered: 0, enRoute: 0, pending: 0 },
    };

    filteredOrders.forEach((order) => {
      const rt = (order.round_time || "").trim();
      let key = "07:00";
      if (rt.startsWith("09") || rt.startsWith("10")) key = "09:30";
      else if (rt.startsWith("11") || rt.startsWith("12") || rt.startsWith("13")) key = "12:00";
      else if (rt.startsWith("14") || rt.startsWith("15") || rt.startsWith("16")) key = "14:30";
      else if (rt.startsWith("07") || rt.startsWith("08") || rt.startsWith("06")) key = "07:00";

      const target = roundsMap[key];
      if (target) {
        if (order.status.includes("סופק")) target.delivered++;
        else if (order.status.includes("יצא לדרך")) target.enRoute++;
        else target.pending++;
      }
    });

    return Object.values(roundsMap);
  }, [filteredOrders]);

  // 5. Driver Fleet Comparison Data
  const driverFleetData = useMemo(() => {
    const hikmatOrders = orders.filter((o) => o.driver.includes("חכמת"));
    const aliOrders = orders.filter((o) => o.driver.includes("עלי"));
    const otherOrders = orders.filter(
      (o) => !o.driver.includes("חכמת") && !o.driver.includes("עלי"),
    );

    const calc = (arr: ScheduleOrder[], name: string, capacity: string) => {
      const delivered = arr.filter((o) => o.status.includes("סופק")).length;
      const enRoute = arr.filter((o) => o.status.includes("יצא לדרך")).length;
      const pending = arr.filter(
        (o) => !o.status.includes("סופק") && !o.status.includes("יצא לדרך"),
      ).length;
      return {
        name,
        capacity,
        total: arr.length,
        delivered,
        enRoute,
        pending,
        rate: arr.length > 0 ? Math.round((delivered / arr.length) * 100) : 0,
      };
    };

    return [
      calc(hikmatOrders, "חכמת (מרצדס מנוף)", "18 בלות / 26 טון"),
      calc(aliOrders, "עלי (איסוזו פלטה)", "חלוקה מהירה"),
      ...(otherOrders.length > 0 ? [calc(otherOrders, "נהגים נוספים / רמסע", "כללי")] : []),
    ];
  }, [orders]);

  // 6. Warehouse Flow Data
  const warehouseFlowData = useMemo(() => {
    const harashOrders = filteredOrders.filter((o) => o.warehouse.includes("החרש"));
    const talmidOrders = filteredOrders.filter((o) => o.warehouse.includes("התלמיד"));

    return [
      {
        warehouse: "4 החרש 10 (רעננה)",
        total: harashOrders.length,
        delivered: harashOrders.filter((o) => o.status.includes("סופק")).length,
        pending: harashOrders.filter((o) => !o.status.includes("סופק")).length,
      },
      {
        warehouse: "1 התלמיד 6 (הוד השרון)",
        total: talmidOrders.length,
        delivered: talmidOrders.filter((o) => o.status.includes("סופק")).length,
        pending: talmidOrders.filter((o) => !o.status.includes("סופק")).length,
      },
    ];
  }, [filteredOrders]);

  return (
    <GlassCard glow className="p-5 border-slate-800 space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-md shadow-sky-500/10">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                ניתוח נתוני סידור והשלמת משמרת (Recharts Logistics)
              </h2>
              <span className="rounded-full bg-sky-500/20 border border-sky-500/40 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                סנכרון ענן חי
              </span>
            </div>
            <p className="text-xs text-slate-400">
              מחווני משימות ממתינות, אחוזי סגירת סבבים, פילוח לפי נהג ומחסן בזמן אמת מ-Google Sheets
            </p>
          </div>
        </div>

        {/* Action & Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Driver Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
            <Truck className="size-3.5 text-sky-400" />
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-100">
                כל הנהגים
              </option>
              <option value="hikmat" className="bg-slate-900 text-slate-100">
                חכמת (מרצדס מנוף)
              </option>
              <option value="ali" className="bg-slate-900 text-slate-100">
                עלי (איסוזו פלטה)
              </option>
              <option value="other" className="bg-slate-900 text-slate-100">
                אחר / רמסע
              </option>
            </select>
          </div>

          {/* Warehouse Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
            <Warehouse className="size-3.5 text-amber-400" />
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900 text-slate-100">
                כל המחסנים
              </option>
              <option value="harash" className="bg-slate-900 text-slate-100">
                4 החרש 10 (רעננה)
              </option>
              <option value="talmid" className="bg-slate-900 text-slate-100">
                1 התלמיד 6 (הוד השרון)
              </option>
            </select>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-0.5">
            <button
              onClick={() => setActiveChartTab("overview")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                activeChartTab === "overview"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              סקירה
            </button>
            <button
              onClick={() => setActiveChartTab("rounds")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                activeChartTab === "rounds"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              סבבים
            </button>
            <button
              onClick={() => setActiveChartTab("fleet")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                activeChartTab === "fleet"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              צי רכב
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="סנכרן נתוני סידור כעת מ-Google Sheets"
              className="inline-flex items-center gap-1 rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              <span>רענן</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Shift Completion Rate */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">אחוז השלמת משמרת</span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-400">
              {metrics.completionRate}%
            </span>
            <span className="text-xs text-slate-400">
              ({metrics.delivered} מתוך {metrics.total})
            </span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {metrics.inProgressRate}% כולל משימות שכרגע בשינוע שטח
          </p>
        </div>

        {/* KPI 2: Pending Tasks */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">משימות ממתינות להעמסה</span>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-amber-400">{metrics.pending}</span>
            <span className="text-xs text-slate-400">הזמנות בתור</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{
                width: `${metrics.total > 0 ? (metrics.pending / metrics.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">ממתינות להעמסה במחסן 4 החרש / 1 התלמיד</p>
        </div>

        {/* KPI 3: In Transit */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-slate-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">בשינוע פעיל (בדרך לאתר)</span>
            <span className="grid size-8 place-items-center rounded-xl bg-sky-500/20 text-sky-400">
              <Truck className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-sky-400">{metrics.enRoute}</span>
            <span className="text-xs text-slate-400">משאיות בתנועה</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{
                width: `${metrics.total > 0 ? (metrics.enRoute / metrics.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">ניווט Waze פעיל ומעקב סטטוס בזמן אמת</p>
        </div>

        {/* KPI 4: Digital Delivery Notes */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-slate-900/80 p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">תעודות משלוח חתומות</span>
            <span className="grid size-8 place-items-center rounded-xl bg-purple-500/20 text-purple-400">
              <Layers className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-purple-400">
              {metrics.signedDeliveryNotes}
            </span>
            <span className="text-xs text-slate-400">חתימות דיגיטליות</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{
                width: `${metrics.total > 0 ? (metrics.signedDeliveryNotes / metrics.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">ארכוב אוטומטי בתיקיית Google Drive</p>
        </div>
      </div>

      {/* Main Charts Section */}
      {metrics.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-400">
          <AlertCircle className="mx-auto size-8 text-slate-500 mb-2" />
          <p className="text-sm font-semibold text-slate-300">אין נתונים להצגה בפילוח הנוכחי</p>
          <p className="text-xs text-slate-500 mt-1">
            נסה לבחור &quot;כל הנהגים&quot; או &quot;כל המחסנים&quot;, או סנכרן הזמנות מגיליון ענן.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Chart Left Column: Rounds Timeline or Fleet (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {activeChartTab === "fleet"
                    ? "עומס צי רכב ותפוקה לפי נהג"
                    : "התקדמות סבבי חלוקה לאורך יום העבודה (07:00 ❯ 14:30)"}
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {activeChartTab === "fleet" ? "חלוקה לפי משאית" : "הזמנות לפי חלון שעה"}
              </span>
            </div>

            <div className="h-72 w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3">
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === "fleet" ? (
                  <BarChart
                    data={driverFleetData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <Tooltip content={<CustomHebrewTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar
                      dataKey="delivered"
                      name="סופק בהצלחה"
                      fill={STATUS_COLORS.delivered}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="enRoute"
                      name="בשינוע"
                      fill={STATUS_COLORS.enRoute}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      name="ממתין להעמסה"
                      fill={STATUS_COLORS.pending}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                ) : activeChartTab === "rounds" ? (
                  <AreaChart
                    data={roundsTimelineData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.delivered} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={STATUS_COLORS.delivered} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={STATUS_COLORS.pending} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={STATUS_COLORS.pending} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="roundName"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <Tooltip content={<CustomHebrewTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      name="סופק"
                      stroke={STATUS_COLORS.delivered}
                      fillOpacity={1}
                      fill="url(#colorDelivered)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      name="ממתין להעמסה"
                      stroke={STATUS_COLORS.pending}
                      fillOpacity={1}
                      fill="url(#colorPending)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={roundsTimelineData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="time"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#334155" }}
                    />
                    <Tooltip content={<CustomHebrewTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar
                      dataKey="delivered"
                      name="סופק בהצלחה"
                      fill={STATUS_COLORS.delivered}
                      stackId="a"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="enRoute"
                      name="בדרך לאתר"
                      fill={STATUS_COLORS.enRoute}
                      stackId="a"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      name="ממתין להעמסה"
                      fill={STATUS_COLORS.pending}
                      stackId="a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Right Column: Donut Status Distribution (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieIcon className="size-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">התפלגות סטטוס משימות</h3>
              </div>
              <span className="text-xs text-slate-400">סה״כ {metrics.total} הזמנות</span>
            </div>

            <div className="relative h-72 w-full rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomHebrewTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                <span className="text-2xl font-black font-mono text-slate-100">
                  {metrics.completionRate}%
                </span>
                <span className="text-[10px] text-slate-400 font-bold">הושלמו</span>
              </div>

              {/* Custom Legend at Bottom */}
              <div className="flex flex-wrap justify-center gap-3 text-[11px] pt-1">
                {statusPieData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-300 font-medium">
                      {item.name}:{" "}
                      <strong className="font-mono text-slate-100">{item.value}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Logistics Strip */}
      <div className="border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
            <Warehouse className="size-3.5 text-sky-400" />
            <span>תפוקה לפי מוקדי אספקה (4 החרש 10 / 1 התלמיד 6):</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            סנכרון תעודות משלוח מ-Google Sheets
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          {warehouseFlowData.map((wh, idx) => {
            const whRate = wh.total > 0 ? Math.round((wh.delivered / wh.total) * 100) : 0;
            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-3"
              >
                <div className="space-y-1">
                  <span className="font-bold text-slate-200">{wh.warehouse}</span>
                  <p className="text-[11px] text-slate-400">
                    סופקו: <strong className="text-emerald-400">{wh.delivered}</strong> | ממתינים:{" "}
                    <strong className="text-amber-400">{wh.pending}</strong>
                  </p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-base font-bold text-sky-400">{whRate}%</span>
                  <p className="text-[10px] text-slate-500">השלמה</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

// Custom Hebrew Tooltip for crisp Recharts display
interface TooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
  payload?: Record<string, unknown>;
}

function CustomHebrewTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-2.5 shadow-xl backdrop-blur-md text-right text-xs space-y-1 z-50">
      {label && <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>}
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color || "#0284c7" }}
            />
            <span className="text-slate-300">{entry.name}:</span>
          </div>
          <span className="font-mono font-bold text-slate-100">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
