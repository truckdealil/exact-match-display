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

const INITIAL_SCHEDULE_ORDERS: ScheduleOrder[] = [
  {
    round_time: "סבב 1 (08:00)",
    order_id: "6215710",
    customer_id: "612108",
    customer_name: "לי-רן יזום והשקעות (מוצקין 22)",
    warehouse: "🏭 4️⃣(החרש 10)",
    address: "מוצקין 22, רעננה",
    driver: "חכמת (מרצדס מנוף 615-41-002)",
    items: "2 בלות חול, 40 שק מלט נשר",
    deposits: '2 בלות (מק"ט 60002), 1 משטח סבן (מק"ט 60060)',
    big_bags_deposit: 2,
    pallets_deposit: 1,
    waze_url:
      "https://waze.com/ul?q=%D7%9E%D7%95%D7%A6%D7%A7%D7%99%D7%9F%2022%2C%20%D7%A8%D7%A2%D7%A0%D7%A0%D7%94&navigate=yes",
    status: "יצא לדרך",
    whatsapp_action: "שדר לחכמת",
    has_delivery_note: false,
    phone: "0505669924",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 1 (08:30)",
    order_id: "6215711",
    customer_id: "604380",
    customer_name: "חברת הכל מבראשית (טל ארביב)",
    warehouse: "🏟️ 1️⃣(התלמיד 6)",
    address: "שער 14, אוניברסיטת תל אביב",
    driver: "עלי (איסוזו חלוקה 651-51-701)",
    items: "35 שק טיח חוץ, 10 כלי עבודה",
    deposits: '1 משטח סבן (מק"ט 60060)',
    big_bags_deposit: 0,
    pallets_deposit: 1,
    waze_url:
      "https://waze.com/ul?q=%D7%A9%D7%A2%D7%A8%2014%2C%20%D7%90%D7%95%D7%A0%D7%99%D7%91%D7%A8%D7%A1%D7%99%D7%98%D7%AA%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91&navigate=yes",
    status: "מוכן להעמסה",
    whatsapp_action: "שדר לעלי",
    has_delivery_note: false,
    phone: "0525689416",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 2 (11:00)",
    order_id: "6215712",
    customer_id: "616161",
    customer_name: "עמית ושרית סולברג (איתי)",
    warehouse: "🏭 4️⃣(החרש 10)",
    address: "פעמונית 47, הוד השרון",
    driver: "חכמת (מרצדס מנוף 615-41-002)",
    items: "4 בלות סומסום, 2 משטחי בלוקים 20",
    deposits: '4 בלות (מק"ט 60002), 2 משטחי בלוקים (מק"ט 60006)',
    big_bags_deposit: 4,
    pallets_deposit: 2,
    waze_url:
      "https://waze.com/ul?q=%D7%A4%D7%A2%D7%9E%D7%95%D7%A0%D7%99%D7%AA%2047%2C%20%D7%94%D7%95%D7%93%20%D7%94%D7%A9%D7%A8%D7%95%D7%9F&navigate=yes",
    status: "בהכנה",
    whatsapp_action: "שדר לחכמת",
    has_delivery_note: false,
    phone: "0548373707",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 2 (11:30)",
    order_id: "6215713",
    customer_id: "604368",
    customer_name: 'ד.ניב שיפוצים (ב"ס חינוך מיוחד)',
    warehouse: "🏟️ 1️⃣(התלמיד 6)",
    address: "הבנים 14, כפר סבא",
    driver: "עלי (איסוזו חלוקה 651-51-701)",
    items: "2 בלות טיט, 30 שק דבק קרמיקה 109",
    deposits: '2 בלות (מק"ט 60002), 1 משטח סבן (מק"ט 60060)',
    big_bags_deposit: 2,
    pallets_deposit: 1,
    waze_url:
      "https://waze.com/ul?q=%D7%94%D7%91%D7%A0%D7%99%D7%9D%2014%2C%20%D7%9B%D7%A4%D7%A8%20%D7%A1%D7%91%D7%90&navigate=yes",
    status: "בסידור עבודה",
    whatsapp_action: "שדר לעלי",
    has_delivery_note: false,
    phone: "0542108810",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 3 (14:00)",
    order_id: "6215504",
    customer_id: "602568",
    customer_name: "שלום בוקטוס (רועי)",
    warehouse: "🏭 4️⃣(החרש 10)",
    address: "הנרייטה סולד 20, הוד השרון",
    driver: "חכמת (מרצדס מנוף 615-41-002)",
    items: "1 בלה חול, 15 שק מלט נשר",
    deposits: '1 בלה (מק"ט 60002)',
    big_bags_deposit: 1,
    pallets_deposit: 0,
    waze_url:
      "https://waze.com/ul?q=%D7%94%D7%A0%D7%A8%D7%99%D7%99%D7%98%D7%94%20%D7%A1%D7%95%D7%9C%D7%93%2020%2C%20%D7%94%D7%95%D7%93%20%D7%94%D7%A9%D7%A8%D7%95%D7%9F&navigate=yes",
    status: "סופק במלואו",
    whatsapp_action: "שדר לחכמת",
    has_delivery_note: true,
    phone: "0506707779",
    timestamp: new Date().toISOString(),
  },
];

/**
 * קריאת כל הזמנות הסידור המבצעי מהאחסון
 */
export function loadScheduleOrders(): ScheduleOrder[] {
  if (typeof window === "undefined") return INITIAL_SCHEDULE_ORDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SCHEDULE_ORDERS));
      return INITIAL_SCHEDULE_ORDERS;
    }
    return JSON.parse(raw) as ScheduleOrder[];
  } catch {
    return INITIAL_SCHEDULE_ORDERS;
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
 * סנכרון מבצעי מול שרת Google Apps Script של גיליון מערכת מאוחדת (1Ie7gKql...)
 * טאב: הזמנות
 */
export async function syncScheduleFromSheets(): Promise<{
  success: boolean;
  orders: ScheduleOrder[];
  message: string;
}> {
  const endpoint = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;
  const token =
    (import.meta.env["VITE_APPS_SCRIPT_TOKEN"] as string | undefined) || "saban_secret_token_2026";

  if (!endpoint) {
    const local = loadScheduleOrders();
    return {
      success: true,
      orders: local,
      message: "טעינה ממאגר שטח מקומי (Apps Script טרם הוגדר)",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = `${endpoint}?action=getOrders&token=${encodeURIComponent(token)}&sheetId=${UNIFIED_SPREADSHEET_ID}&tab=${encodeURIComponent(MASTER_TAB)}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as { success?: boolean; orders?: ScheduleOrder[] };
      if (data.orders && Array.isArray(data.orders) && data.orders.length > 0) {
        saveScheduleOrders(data.orders);
        return {
          success: true,
          orders: data.orders,
          message: `סונכרנו ${data.orders.length} הזמנות מגיליון מערכת מאוחדת (${MASTER_TAB})`,
        };
      }
    }
  } catch (err) {
    console.warn("Apps Script sync fallback to local cache:", err);
  }

  const localOrders = loadScheduleOrders();
  return {
    success: true,
    orders: localOrders,
    message: `נטענו ${localOrders.length} הזמנות מהזיכרון המקומי`,
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
  const endpoint = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;
  const token =
    (import.meta.env["VITE_APPS_SCRIPT_TOKEN"] as string | undefined) || "saban_secret_token_2026";
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
  const endpoint = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;
  const token =
    (import.meta.env["VITE_APPS_SCRIPT_TOKEN"] as string | undefined) || "saban_secret_token_2026";
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
  const endpoint = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;
  const token =
    (import.meta.env["VITE_APPS_SCRIPT_TOKEN"] as string | undefined) || "saban_secret_token_2026";
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
