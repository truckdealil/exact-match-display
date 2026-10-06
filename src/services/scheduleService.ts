/**
 * ==============================================================================
 * ח. סבן חומרי בניין (1994) בע״מ | שירות סידור מבצעי ומערכת מאוחדת
 * ==============================================================================
 *
 * גיליון יעד ראשי:
 * מזהה גיליון מערכת מאוחדת: 1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c
 * לשונית עבודה ראשית (Master Tab): "הזמנות"
 *
 * עמודות טאב הזמנות:
 * 1. Date (תאריך ושעה)
 * 2. OrderId (מספר הזמנה)
 * 3. CustId (מספר לקוח קומקס)
 * 4. CustName (שם לקוח / אתר)
 * 5. Warehouse (מחסן מקור: 🏭 החרש 10 או 🏟️ התלמיד 6)
 * 6. SiteAddress (כתובת יעד ועיר)
 * 7. ItemsSummary (פירוט פריטים וכמויות)
 * 8. BigBagDeposits (פקדון בלות 60002 ביחס 1:1)
 * 9. PalletDeposits (פקדון משטחים 60060 / 60006)
 * 10. Driver (נהג משובץ)
 * 11. DriveFolderUrl (תיקיית דרייב תעודות משלוח)
 * 12. WazeUrl (ניווט Waze)
 * 13. WhatsAppAction (שידור לוואטסאפ לנהג)
 * 14. HasDeliveryNote (האם קיימת תעודה חתומה)
 * 15. Status (סטטוס ביצוע)
 */

import { toast } from "sonner";
import { audioService } from "./audioService";

export const UNIFIED_SPREADSHEET_ID =
  (import.meta.env["VITE_UNIFIED_SPREADSHEET_ID"] as string | undefined) ||
  "1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c";
export const SABAN_SHEET_ID = UNIFIED_SPREADSHEET_ID;
export const MASTER_TAB = "הזמנות";

export const NOA_AI_SPREADSHEET_ID =
  (import.meta.env["VITE_NOA_AI_SPREADSHEET_ID"] as string | undefined) ||
  "1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA";
export const SABAN_SHEET_TAB = "הזמנות"; // Main unified orders tab
export const LEGACY_SHEET_TAB = "דוח_בוקר_מבצעי";

export const DEFAULT_GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwAkBK1Z051WmTvyDsRNrUf3xAS0MOCio9QRdoGyYxQdN66AekWhG_YFAgmKNEl7mR_/exec";
export const DEFAULT_APPS_SCRIPT_TOKEN = "saban_secret_token_2026";

export function getScheduleAppsScriptEndpoint(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("saban_custom_apps_script_url");
    if (custom && custom.trim().startsWith("http")) return custom.trim();
  }
  return (
    (import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined) ||
    DEFAULT_GOOGLE_APPS_SCRIPT_URL
  );
}

export function getScheduleAppsScriptToken(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("saban_custom_apps_script_token");
    if (custom && custom.trim()) return custom.trim();
  }
  return (
    (import.meta.env["VITE_APPS_SCRIPT_TOKEN"] as string | undefined) || DEFAULT_APPS_SCRIPT_TOKEN
  );
}

export interface ScheduleOrder {
  round_time: string;
  order_id: string; // מספר הזמנה בן 7 ספרות
  customer_id?: string; // מספר לקוח קומקס
  customer_name: string;
  warehouse: string;
  address: string;
  driver: string;
  items: string;
  deposits: string;
  big_bags_deposit?: number;
  pallets_deposit?: number;
  block_pallets_deposit?: number;
  waze_url: string;
  status: string;
  whatsapp_action: string;
  has_delivery_note?: boolean;
  signature_base64?: string;
  site_manager_name?: string;
  signature_timestamp?: string;
  phone?: string;
  timestamp?: string;
}

export interface StatusNotificationEvent {
  order_id: string;
  customer_name: string;
  oldStatus?: string;
  newStatus: string;
  driver: string;
  timestamp: string;
  warehouse?: string;
}

const STORAGE_KEY = "saban_unified_orders_v2";
const RECENT_UPDATES_KEY = "saban_recent_status_updates_v2";

// נתוני דמה נוקו לחלוטין (Zero Mock Data) - סנכרון ישיר מול הגיליון בענן
const INITIAL_SCHEDULE_ORDERS: ScheduleOrder[] = [];

/**
 * מחיקת נתוני דמה היסטוריים מה-localStorage
 */
export function purgeMockScheduleOrders(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const orders = JSON.parse(raw) as ScheduleOrder[];
    const mockIds = new Set(["6215710", "6215711", "6215712", "6215713", "6215504"]);
    const hasMock = orders.some(
      (o) =>
        mockIds.has(o.order_id) ||
        o.order_id.toLowerCase().includes("mock") ||
        o.order_id.toLowerCase().includes("demo") ||
        o.customer_name.includes("דמה"),
    );
    if (hasMock) {
      const cleaned = orders.filter(
        (o) =>
          !mockIds.has(o.order_id) &&
          !o.order_id.toLowerCase().includes("mock") &&
          !o.order_id.toLowerCase().includes("demo") &&
          !o.customer_name.includes("דמה"),
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      window.dispatchEvent(new CustomEvent("saban_schedule_updated", { detail: cleaned }));
    }
  } catch {
    /* ignore */
  }
}

/**
 * מחיקה מוחלטת של כל ההזמנות המקומיות לאיפוס וסנכרון מלא מול ענן Google Sheets
 */
export function clearAllLocalOrders(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("saban_schedule_updated", { detail: [] }));
}

/**
 * קריאת כל הזמנות הסידור המבצעי מהאחסון
 */
export function loadScheduleOrders(): ScheduleOrder[] {
  if (typeof window === "undefined") return [];
  purgeMockScheduleOrders();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScheduleOrder[];
  } catch {
    return [];
  }
}

/**
 * שמירת הזמנות באחסון
 */
export function saveScheduleOrders(orders: ScheduleOrder[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    window.dispatchEvent(new CustomEvent("saban_schedule_updated", { detail: orders }));
  } catch {
    /* ignore */
  }
}

/**
 * קריאת היסטוריית התראות סטטוס אחרונות עבור ראמי
 */
export function loadRecentStatusUpdates(): StatusNotificationEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_UPDATES_KEY);
    return stored ? (JSON.parse(stored) as StatusNotificationEvent[]) : [];
  } catch {
    return [];
  }
}

/**
 * הצגת התראת Toast בעברית בזמן אמת לראמי בעת עדכון סטטוס הזמנה + רטט Haptic
 */
export function notifyStatusChange(event: StatusNotificationEvent): void {
  const { order_id, customer_name, newStatus, driver } = event;

  // Samsung Note 23 / S23 Ultra haptic pulse
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([20, 30]);
  }

  if (newStatus.includes("סופק במלואו") || newStatus === "סופק במלואו") {
    toast.success(`נועה עדכנה סטטוס: סופק במלואו! ✅`, {
      description: `הזמנה ${order_id} (${customer_name}) סופקה במלואה ע"י ${driver}`,
      duration: 6500,
    });
    void audioService.play("success");
  } else if (newStatus.includes("סופק")) {
    toast.success(`נועה עדכנה סטטוס: סופק ✅`, {
      description: `הזמנה ${order_id} (${customer_name}) עודכנה ל-סופק במערכת מאוחדת`,
      duration: 6000,
    });
    void audioService.play("success");
  } else if (newStatus.includes("יצא לדרך")) {
    toast.info(`נועה עדכנה סטטוס: יצא לדרך 🚚`, {
      description: `הזמנה ${order_id} (${customer_name}) יצאה ליעד עם ${driver}`,
      duration: 6000,
    });
    void audioService.play("alert");
  } else if (newStatus.includes("מוכן להעמסה")) {
    toast.info(`נועה עדכנה סטטוס: מוכן להעמסה 📦`, {
      description: `הזמנה ${order_id} (${customer_name}) מוכנה כעת להעמסה במחסן`,
      duration: 5500,
    });
    void audioService.play("alert");
  } else {
    toast(`נועה עדכנה סטטוס הזמנה 📋`, {
      description: `הזמנה ${order_id} (${customer_name}) עודכנה ל-"${newStatus}"`,
      duration: 5000,
    });
  }

  // Persist to recent status notifications log
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(RECENT_UPDATES_KEY);
      const list = stored ? (JSON.parse(stored) as StatusNotificationEvent[]) : [];
      list.unshift(event);
      if (list.length > 20) list.pop();
      localStorage.setItem(RECENT_UPDATES_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("saban_order_status_updated", { detail: event }));
    } catch {
      /* ignore */
    }
  }
}

/**
 * מיפוי שורת גיליון גולמית (Row Array) לפי סכמת האב המדויקת של ח. סבן
 *
 * עמודות טאב 'הזמנות' (מערכת מאוחדת - 1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c):
 * Col A (0): תאריך קליטה (timestamp)
 * Col B (1): מספר הזמנה (order_id)
 * Col C (2): מספר לקוח (customer_number, למשל 613304)
 * Col D (3): שם לקוח (customer_name, למשל מאריו הנדסה אספקה חומרי בניין בע"מ)
 * Col E (4): מחסן (warehouse)
 * Col F (5): כתובת אספקה (address)
 * Col G (6): פירוט מוצרים וכמויות (items)
 * Col H (7): פקדון בלות (big_bag_deposit)
 * Col I (8): פקדון משטחים (pallet_deposit)
 * Col J (9): נהג משוייך (driver)
 * Col K (10): תיק לקוח ב-Drive (drive_folder)
 * Col L (11): קישור Waze (waze_url)
 * Col M (12): שיתוף WhatsApp (whatsapp_url)
 * Col N (13): קיימת תעודת משלוח? (status)
 * Col P (15): טלפון נהג (driver_phone)
 */
export function mapRawSheetRowToScheduleOrder(row: any[]): ScheduleOrder {
  // Check if row is from master tab 'הזמנות' (Index 2 is numeric customer ID, length >= 10)
  const isMasterOrdersTab =
    row.length >= 10 &&
    !isNaN(Number(row[2])) &&
    String(row[2]).trim().length >= 4;

  const orderId = String(row[1] || "").trim();

  // In 'הזמנות': Customer Name is Column D (Index 3). In 'דוח_בוקר': Column C (Index 2).
  const customerName = isMasterOrdersTab
    ? String(row[3] || "לקוח ח. סבן").trim()
    : String(row[2] || "לקוח ח. סבן").trim();

  // Warehouse: Column E (Index 4) in 'הזמנות', Column D (Index 3) in 'דוח_בוקר'
  const rawWarehouse = isMasterOrdersTab ? String(row[4] || "") : String(row[3] || "");
  const warehouse =
    rawWarehouse.includes("תלמיד") || rawWarehouse.includes("1")
      ? "🏟️ 1️⃣(התלמיד)"
      : "🏭 4️⃣(החרש)";

  // Address: Column F (Index 5) in 'הזמנות', Column E (Index 4) in 'דוח_בוקר'
  const address = isMasterOrdersTab ? String(row[5] || "") : String(row[4] || "");

  // Driver: Column J (Index 9) in 'הזמנות', Column F (Index 5) in 'דוח_בוקר'
  const rawDriver = isMasterOrdersTab ? String(row[9] || "") : String(row[5] || "");
  let driver = "עלי (משאית איסוזו)";
  if (rawDriver.includes("חכמת") || rawDriver.includes("מנוף")) {
    driver = "חכמת (מרצדס מנוף)";
  } else if (rawDriver.includes("רמסע") || rawDriver.includes("מכולה")) {
    driver = "משאית רמסע מכולות";
  }

  // Items: Column G (Index 6)
  const items = String(row[6] || "").trim();

  // Deposits: In 'הזמנות', Col H is Big Bags and Col I is Pallets.
  let deposits = "פטור";
  if (isMasterOrdersTab) {
    const rawBags = String(row[7] || "").trim();
    const rawPallets = String(row[8] || "").trim();
    const bagText =
      rawBags && rawBags !== "0" && rawBags !== "פטור"
        ? rawBags.includes("בלה")
          ? rawBags
          : `${rawBags} בלות (60002)`
        : "";
    const palletText =
      rawPallets && rawPallets !== "0" && rawPallets !== "פטור"
        ? rawPallets.includes("משטח")
          ? rawPallets
          : `${rawPallets} משטחי סבן (60060)`
        : "";
    deposits = [bagText, palletText].filter(Boolean).join(" | ") || "פטור מפקדונות";
  } else {
    deposits = String(row[7] || "פטור מפקדונות");
  }

  // Status: Column N (Index 13) in 'הזמנות', Column J (Index 9) in 'דוח_בוקר'
  const rawStatus = isMasterOrdersTab ? String(row[13] || "") : String(row[9] || "");
  let status = "בסידור עבודה";
  if (rawStatus.includes("סופק") || rawStatus.includes("כן")) status = "סופק במלואו";
  else if (rawStatus.includes("דרך") || rawStatus.includes("יצא")) status = "יצא לדרך";
  else if (rawStatus.includes("העמסה") || rawStatus.includes("מוכן")) status = "מוכן להעמסה";

  // Waze URL: Column L (Index 11) in 'הזמנות', Column I (Index 8) in 'דוח_בוקר'
  const rawWaze = isMasterOrdersTab ? String(row[11] || "") : String(row[8] || "");
  const waze_url = rawWaze.startsWith("http")
    ? rawWaze
    : `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;

  // Round / Time: Column A (Index 0)
  const round_time = String(row[0] || "סבב בוקר");

  return {
    order_id: orderId,
    customer_id: isMasterOrdersTab ? String(row[2] || "").trim() : undefined,
    customer_name: customerName,
    warehouse,
    address,
    driver,
    items,
    deposits,
    waze_url,
    status,
    round_time,
    whatsapp_action: driver.includes("חכמת") ? "שדר לחכמת" : "שדר לעלי",
    has_delivery_note: status.includes("סופק"),
    timestamp: new Date().toISOString(),
  };
}

/**
 * נרמול שורת הזמנה מהגיליון (תמיכה במערכים ובאובייקטים בכותרות עברית ואנגלית)
 */
export function normalizeSheetOrder(raw: any): ScheduleOrder {
  if (Array.isArray(raw)) {
    return mapRawSheetRowToScheduleOrder(raw);
  }

  const order_id = String(
    raw["מספר הזמנה"] || raw.order_id || raw.OrderId || raw.id || `ORD-${Date.now()}`,
  ).trim();

  const customer_id = String(
    raw["מספר לקוח"] || raw.customer_number || raw.customer_id || raw.CustId || "",
  ).trim();

  // Extract customer name - never fall back to "לקוח כללי", fallback to 'לקוח ח. סבן'
  let customer_name = String(
    raw["שם לקוח"] || raw["שם לקוח / אתר"] || raw.customer_name || raw.CustName || "",
  ).trim();

  // If customer_name was mistakenly set to a numeric customer ID, or is empty:
  if (!customer_name || (!isNaN(Number(customer_name)) && customer_name.length <= 10)) {
    customer_name = "לקוח ח. סבן";
  }

  // Warehouse: 'מחסן' in הזמנות, 'מחסן מקור' in דוח_בוקר
  const rawWarehouse = String(
    raw["מחסן"] || raw["מחסן מקור"] || raw.warehouse || raw.Warehouse || "",
  ).trim();
  let warehouse = rawWarehouse || "🏭 4️⃣(החרש)";
  if (rawWarehouse.includes("תלמיד") || rawWarehouse.includes("1")) {
    warehouse = "🏟️ 1️⃣(התלמיד)";
  } else if (rawWarehouse.includes("כפר ברא") || rawWarehouse.includes("ראשי")) {
    warehouse = "🏭 מחסן ראשי (כפר ברא)";
  } else if (rawWarehouse.includes("חרש") || rawWarehouse.includes("4")) {
    warehouse = "🏭 4️⃣(החרש)";
  }

  // Address: 'כתובת אספקה' in הזמנות, 'כתובת יעד ועיר' in דוח_בוקר
  const address = String(
    raw["כתובת אספקה"] ||
      raw["כתובת יעד ועיר"] ||
      raw["כתובת יעד"] ||
      raw.address ||
      raw.SiteAddress ||
      "",
  ).trim();

  // Driver: 'נהג משוייך' in הזמנות, 'נהג משובץ' in דוח_בוקר
  const rawDriver = String(
    raw["נהג משוייך"] || raw["נהג משובץ"] || raw.driver || raw.Driver || "",
  ).trim();
  let driver = rawDriver || "עלי (משאית איסוזו)";
  if (rawDriver.includes("חכמת") || rawDriver.includes("מנוף")) {
    driver = rawDriver;
  } else if (rawDriver.includes("רמסע") || rawDriver.includes("מכולה")) {
    driver = rawDriver;
  }

  // Items: 'פירוט מוצרים וכמויות'
  const items = String(
    raw["פירוט מוצרים וכמויות"] ||
      raw["פירוט פריטים וכמויות"] ||
      raw.items ||
      raw.ItemsSummary ||
      "",
  ).trim();

  // Deposits: Col H ('פקדון בלות') and Col I ('פקדון משטחים') in הזמנות
  const rawBags = String(raw["פקדון בלות"] || raw.big_bag_deposit || "").trim();
  const rawPallets = String(raw["פקדון משטחים"] || raw.pallet_deposit || "").trim();
  let deposits = "";
  if (rawBags || rawPallets) {
    const bagText =
      rawBags && rawBags !== "0" && rawBags !== "פטור"
        ? rawBags.includes("בלה")
          ? rawBags
          : `${rawBags} בלות (60002)`
        : "";
    const palletText =
      rawPallets && rawPallets !== "0" && rawPallets !== "פטור"
        ? rawPallets.includes("משטח")
          ? rawPallets
          : `${rawPallets} משטחי סבן (60060)`
        : "";
    deposits = [bagText, palletText].filter(Boolean).join(" | ");
  }
  if (!deposits) {
    deposits = String(
      raw["פקדונות (בלות/משטחים)"] ||
        raw["פקדונות"] ||
        raw.deposits ||
        calculateDeposits(items) ||
        "פטור מפקדונות",
    );
  }

  // Status: 'קיימת תעודת משלוח?' in הזמנות, 'סטטוס ביצוע' in דוח_בוקר
  const rawStatus = String(
    raw["קיימת תעודת משלוח?"] || raw["סטטוס ביצוע"] || raw.status || raw.Status || "",
  );
  let status = "בסידור עבודה";
  if (rawStatus.includes("סופק") || rawStatus.includes("כן")) status = "סופק במלואו";
  else if (rawStatus.includes("דרך") || rawStatus.includes("יצא")) status = "יצא לדרך";
  else if (rawStatus.includes("העמסה") || rawStatus.includes("מוכן")) status = "מוכן להעמסה";

  // Waze URL: 'קישור Waze' in הזמנות, 'ניווט Waze' in דוח_בוקר
  const rawWaze = String(raw["קישור Waze"] || raw["ניווט Waze"] || raw.waze_url || "").trim();
  const waze_url = rawWaze.startsWith("http")
    ? rawWaze
    : `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;

  // Round / Time: 'תאריך קליטה' in הזמנות, 'סבב ושעה' in דוח_בוקר
  const round_time = String(raw["סבב ושעה"] || raw["תאריך קליטה"] || raw.round_time || "סבב בוקר");

  const whatsapp_action = driver.includes("חכמת") ? "שדר לחכמת" : "שדר לעלי";

  return {
    order_id,
    customer_id: customer_id || undefined,
    customer_name,
    warehouse,
    address,
    driver,
    items,
    deposits: deposits || "פטור מפקדונות",
    waze_url,
    status,
    round_time,
    whatsapp_action,
    has_delivery_note: status.includes("סופק"),
    timestamp: new Date().toISOString(),
  };
}

/**
 * סנכרון מבצעי מול שרת Google Apps Script של גיליון מערכת מאוחדת (1Ie7gKql...)
 * טאב: הזמנות / דוח_בוקר_מבצעי
 */
export async function syncScheduleFromSheets(): Promise<{
  success: boolean;
  orders: ScheduleOrder[];
  message: string;
}> {
  const endpoint = getScheduleAppsScriptEndpoint();
  const token = getScheduleAppsScriptToken();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Try primary tab: הזמנות
    let url = `${endpoint}?action=getOrders&token=${encodeURIComponent(token)}&sheetId=${UNIFIED_SPREADSHEET_ID}&tab=${encodeURIComponent(MASTER_TAB)}`;
    let res = await fetch(url, { signal: controller.signal });

    let json = res.ok
      ? ((await res.json()) as { success?: boolean; orders?: Array<Record<string, unknown>> })
      : null;

    // If no orders on master tab, try fallback tab: דוח_בוקר_מבצעי
    if (!json?.orders || json.orders.length === 0) {
      url = `${endpoint}?action=getOrders&token=${encodeURIComponent(token)}&sheetId=${UNIFIED_SPREADSHEET_ID}&tab=${encodeURIComponent(LEGACY_SHEET_TAB)}`;
      res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        json = (await res.json()) as { success?: boolean; orders?: Array<Record<string, unknown>> };
      }
    }

    clearTimeout(timeoutId);

    if (json?.orders && Array.isArray(json.orders) && json.orders.length > 0) {
      const normalized = json.orders.map((raw) => normalizeSheetOrder(raw));
      saveScheduleOrders(normalized);
      return {
        success: true,
        orders: normalized,
        message: `סונכרנו בהצלחה ${normalized.length} הזמנות חיות מגיליון מערכת מאוחדת`,
      };
    }
  } catch (err) {
    console.warn("Apps Script sync fallback to local cache:", err);
  }

  const localOrders = loadScheduleOrders();
  return {
    success: true,
    orders: localOrders,
    message:
      localOrders.length > 0
        ? `נטענו ${localOrders.length} הזמנות מהזיכרון המקומי`
        : "הגיליון ריק כעת מהזמנות פתוחות",
  };
}

/**
 * חישוב פקדונות מדויק:
 * - בלות: מק"ט 60002 (יחס 1:1 לחול, סומסום, טיט, חמרה, מצע)
 * - משטחי סבן: מק"ט 60060 (משטח לכל 38-40 שקים)
 * - משטחי בלוקים: מק"ט 60006
 */
export function calculateDeposits(itemsText: string): string {
  const parts: string[] = [];
  const lower = itemsText.toLowerCase();

  const bigBagMatch = itemsText.match(/(\d+)\s*(?:בלות|בלה|שק גדול)/);
  let bigBags = bigBagMatch ? parseInt(bigBagMatch[1], 10) : 0;
  if (!bigBags && (lower.includes("בלה") || lower.includes("חול") || lower.includes("סומסום"))) {
    bigBags = 1;
  }

  if (bigBags > 0) {
    parts.push(`${bigBags} בלות (מק"ט 60002)`);
  }

  const bagsMatch = itemsText.match(/(\d+)\s*(?:שק|שקים|מלט|טיח|דבק)/);
  const bags = bagsMatch ? parseInt(bagsMatch[1], 10) : 0;

  if (bags >= 35 || lower.includes("משטח מלט") || lower.includes("משטח דבק")) {
    const pallets = Math.max(1, Math.ceil(bags / 40));
    parts.push(`${pallets} משטח סבן (מק"ט 60060)`);
  }

  if (lower.includes("בלוק")) {
    const blocksMatch = itemsText.match(/(\d+)\s*(?:בלוק|משטחי בלוקים|משטח בלוק)/);
    const blockPallets = blocksMatch ? Math.max(1, parseInt(blocksMatch[1], 10)) : 1;
    parts.push(`${blockPallets} משטחי בלוקים (מק"ט 60006)`);
  }

  return parts.length > 0 ? parts.join(", ") : "פטור מפקדונות";
}

export function generateWazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

export function generateWhatsAppAction(driver: string): string {
  if (driver.includes("חכמת")) return "שדר לחכמת";
  if (driver.includes("עלי")) return "שדר לעלי";
  return "שדר לנהג";
}

/**
 * שליפת הזמנות עם סינון
 */
export function get_schedule_orders(filters?: {
  filter_driver?: string;
  filter_status?: string;
  date?: string;
}): { success: boolean; count: number; orders: ScheduleOrder[] } {
  const allOrders = loadScheduleOrders();
  let filtered = allOrders;

  if (filters?.filter_driver) {
    const d = filters.filter_driver.toLowerCase();
    filtered = filtered.filter((o) => o.driver.toLowerCase().includes(d));
  }

  if (filters?.filter_status) {
    const s = filters.filter_status.toLowerCase();
    filtered = filtered.filter((o) => o.status.toLowerCase().includes(s));
  }

  return {
    success: true,
    count: filtered.length,
    orders: filtered,
  };
}

/**
 * הקלדת שורת הזמנה חדשה לגיליון מערכת מאוחדת
 */
export function append_order_to_sheet(orderData: {
  round_time: string;
  order_id: string;
  customer_name: string;
  warehouse: string;
  address: string;
  driver: string;
  items: string;
  deposits?: string;
  waze_url?: string;
  status?: string;
  whatsapp_action?: string;
  phone?: string;
}): { success: boolean; order: ScheduleOrder } {
  const current = loadScheduleOrders();

  const deposits = orderData.deposits || calculateDeposits(orderData.items);
  const waze_url = orderData.waze_url || generateWazeUrl(orderData.address);
  const status = orderData.status || "בסידור עבודה";
  const whatsapp_action = orderData.whatsapp_action || generateWhatsAppAction(orderData.driver);

  const newOrder: ScheduleOrder = {
    ...orderData,
    deposits,
    waze_url,
    status,
    whatsapp_action,
    has_delivery_note: false,
    timestamp: new Date().toISOString(),
  };

  const updated = [newOrder, ...current];
  saveScheduleOrders(updated);

  // Send to Apps Script endpoint
  const endpoint = getScheduleAppsScriptEndpoint();
  const token = getScheduleAppsScriptToken();
  if (endpoint && typeof navigator !== "undefined" && navigator.onLine) {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "injectNewOrder",
        token,
        unifiedSheetId: UNIFIED_SPREADSHEET_ID,
        targetTab: MASTER_TAB,
        orderData: newOrder,
      }),
    }).catch(() => {
      /* ignore */
    });
  }

  return { success: true, order: newOrder };
}

/**
 * עדכון סטטוס ביצוע או שיבוץ נהג
 */
export function update_order_in_sheet(
  order_id: string,
  updates: {
    status?: string;
    driver?: string;
    warehouse?: string;
    notes?: string;
  },
): { success: boolean; order?: ScheduleOrder; message: string } {
  const current = loadScheduleOrders();
  const index = current.findIndex((o) => o.order_id === order_id);

  if (index === -1) {
    return {
      success: false,
      message: `הזמנה ${order_id} לא נמצאה בסידור`,
    };
  }

  const existing = current[index];
  const oldStatus = existing.status;
  const updatedOrder: ScheduleOrder = {
    ...existing,
    ...updates,
    status: updates.status || existing.status,
    driver: updates.driver || existing.driver,
    warehouse: updates.warehouse || existing.warehouse,
  };

  current[index] = updatedOrder;
  saveScheduleOrders(current);

  if (updates.status && updates.status !== oldStatus) {
    notifyStatusChange({
      order_id,
      customer_name: existing.customer_name,
      oldStatus,
      newStatus: updates.status,
      driver: updatedOrder.driver,
      timestamp: new Date().toISOString(),
      warehouse: updatedOrder.warehouse,
    });
  }

  // Push to Apps Script if connected
  const endpoint = getScheduleAppsScriptEndpoint();
  const token = getScheduleAppsScriptToken();
  if (endpoint && typeof navigator !== "undefined" && navigator.onLine) {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateOrderStatus",
        token,
        unifiedSheetId: UNIFIED_SPREADSHEET_ID,
        targetTab: MASTER_TAB,
        orderId: order_id,
        updates,
      }),
    }).catch(() => {
      /* queue handles */
    });
  }

  return {
    success: true,
    order: updatedOrder,
    message: `הזמנה ${order_id} עודכנה בהצלחה בגיליון מערכת מאוחדת`,
  };
}

/**
 * הצמדת חתימת שטח דיגיטלית (S-Pen) להזמנה
 */
export function attachSignatureToOrder(
  order_id: string,
  signatureData: {
    signatureBase64: string;
    siteManagerName: string;
    timestamp: string;
  },
): { success: boolean; order?: ScheduleOrder } {
  const current = loadScheduleOrders();
  const index = current.findIndex((o) => o.order_id === order_id);

  if (index === -1) return { success: false };

  const existing = current[index];
  const updatedOrder: ScheduleOrder = {
    ...existing,
    signature_base64: signatureData.signatureBase64,
    site_manager_name: signatureData.siteManagerName,
    signature_timestamp: signatureData.timestamp,
    has_delivery_note: true,
    status: existing.status.includes("סופק") ? existing.status : "סופק במלואו",
  };

  current[index] = updatedOrder;
  saveScheduleOrders(current);

  // Send signature to Apps Script
  const endpoint = getScheduleAppsScriptEndpoint();
  const token = getScheduleAppsScriptToken();
  if (endpoint && typeof navigator !== "undefined" && navigator.onLine) {
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "attachSignature",
        token,
        unifiedSheetId: UNIFIED_SPREADSHEET_ID,
        targetTab: MASTER_TAB,
        orderId: order_id,
        signatureData,
      }),
    }).catch(() => {});
  }

  return { success: true, order: updatedOrder };
}
