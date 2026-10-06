/**
 * נועה ❤️ | שירות גיליון מבצעי סבן
 * מזהה גיליון: 1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA
 * לשונית עבודה ראשית: דוח_בוקר_מבצעי
 *
 * עמודות הגיליון (A עד K):
 * A - סבב ושעה (round_time)
 * B - מספר הזמנה (order_id)
 * C - שם לקוח / אתר (customer_name)
 * D - מחסן מקור (warehouse: 🏭 4️⃣(החרש) או 🏟️ 1️⃣(התלמיד))
 * E - כתובת יעד ועיר (address)
 * F - נהג משובץ (driver: חכמת (מרצדס מנוף) או עלי (משאית איסוזו))
 * G - פירוט מוצרים וכמויות (items)
 * H - פקדונות (deposits: בלות 60002, משטחי סבן 60060, משטחי בלוקים 60006, פטור)
 * I - ניווט Waze (waze_url: https://waze.com/ul?q=...&navigate=yes)
 * J - סטטוס ביצוע (status: בסידור עבודה, בהכנה, מוכן להעמסה, יצא לדרך, סופק, סופק במלואו)
 * K - שידור WhatsApp (whatsapp_action: שדר לחכמת או שדר לעלי)
 */

import { toast } from "sonner";
import { audioService } from "./audioService";

export const SABAN_SHEET_ID = "1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA";
export const SABAN_SHEET_TAB = "דוח_בוקר_מבצעי";

export interface ScheduleOrder {
  round_time: string; // עמודה A
  order_id: string; // עמודה B (7 ספרות)
  customer_name: string; // עמודה C
  warehouse: string; // עמודה D
  address: string; // עמודה E
  driver: string; // עמודה F
  items: string; // עמודה G
  deposits: string; // עמודה H
  waze_url: string; // עמודה I
  status: string; // עמודה J
  whatsapp_action: string; // עמודה K
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

const STORAGE_KEY = "saban_schedule_orders_v1";
const RECENT_UPDATES_KEY = "saban_recent_status_updates_v1";

const INITIAL_SCHEDULE_ORDERS: ScheduleOrder[] = [
  {
    round_time: "סבב 1 (08:00)",
    order_id: "6215710",
    customer_name: "יוסף שפירא - וילה 8",
    warehouse: "🏭 4️⃣(החרש)",
    address: "הרצל 42, כפר סבא",
    driver: "חכמת (מרצדס מנוף)",
    items: "2 בלות חול, 40 שק מלט",
    deposits: '2 בלות (מק"ט 60002), 1 משטח סבן (מק"ט 60060)',
    waze_url:
      "https://waze.com/ul?q=%D7%94%D7%A8%D7%A6%D7%9C%2042%2C%20%D7%9B%D7%A4%D7%A8%20%D7%A1%D7%91%D7%90&navigate=yes",
    status: "יצא לדרך",
    whatsapp_action: "שדר לחכמת",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 1 (08:30)",
    order_id: "6215711",
    customer_name: 'א.ר. שיווק ובניין בע"מ',
    warehouse: "🏭 4️⃣(החרש)",
    address: "החרש 14, רעננה",
    driver: "עלי (משאית איסוזו)",
    items: "35 שק טיח חוץ, 10 כלי עבודה",
    deposits: '1 משטח סבן (מק"ט 60060)',
    waze_url:
      "https://waze.com/ul?q=%D7%94%D7%97%D7%A8%D7%A9%2014%2C%20%D7%A8%D7%A2%D7%A0%D7%A0%D7%94&navigate=yes",
    status: "מוכן להעמסה",
    whatsapp_action: "שדר לעלי",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 2 (11:00)",
    customer_name: "קבלנות גולן - אתר סביוני השרון",
    order_id: "6215712",
    warehouse: "🏟️ 1️⃣(התלמיד)",
    address: "ז'בוטינסקי 108, הוד השרון",
    driver: "חכמת (מרצדס מנוף)",
    items: "4 בלות סומסום, 2 משטחי בלוקים 20",
    deposits: '4 בלות (מק"ט 60002), 2 משטחי בלוקים (מק"ט 60006)',
    waze_url:
      "https://waze.com/ul?q=%D7%96%27%D7%91%D7%95%D7%98%D7%99%D7%A0%D7%A1%D7%A7%D7%99%20108%2C%20%D7%94%D7%95%D7%93%20%D7%94%D7%A9%D7%A8%D7%95%D7%9F&navigate=yes",
    status: "בהכנה",
    whatsapp_action: "שדר לחכמת",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 2 (11:30)",
    order_id: "6215713",
    customer_name: "דניאל הנדסה ויזמות",
    warehouse: "🏟️ 1️⃣(התלמיד)",
    address: "דרך השרון 55, כפר סבא",
    driver: "עלי (משאית איסוזו)",
    items: "2 בלות טיט, 30 שק דבק קרמיקה",
    deposits: '2 בלות (מק"ט 60002), 1 משטח סבן (מק"ט 60060)',
    waze_url:
      "https://waze.com/ul?q=%D7%93%D7%A8%D7%9A%20%D7%94%D7%A9%D7%A8%D7%95%D7%9F%2055%2C%20%D7%9B%D7%A4%D7%A8%20%D7%A1%D7%91%D7%90&navigate=yes",
    status: "בסידור עבודה",
    whatsapp_action: "שדר לעלי",
    timestamp: new Date().toISOString(),
  },
  {
    round_time: "סבב 1 (07:30)",
    order_id: "6215504",
    customer_name: "אבי לוי שיפוצים",
    warehouse: "🏭 4️⃣(החרש)",
    address: "הבנים 18, פתח תקווה",
    driver: "חכמת (מרצדס מנוף)",
    items: "1 בלה חול, 15 שק מלט",
    deposits: '1 בלה (מק"ט 60002)',
    waze_url:
      "https://waze.com/ul?q=%D7%94%D7%91%D7%A0%D7%99%D7%9D%2018%2C%20%D7%A4%D7%AA%D7%97%20%D7%AA%D7%A7%D7%95%D7%95%D7%94&navigate=yes",
    status: "סופק",
    whatsapp_action: "שדר לחכמת",
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
 * הצגת התראת Toast בעברית בזמן אמת לראמי בעת עדכון סטטוס הזמנה
 */
export function notifyStatusChange(event: StatusNotificationEvent): void {
  const { order_id, customer_name, newStatus, driver } = event;

  if (newStatus.includes("סופק במלואו") || newStatus === "סופק במלואו") {
    toast.success(`נועה עדכנה סטטוס: סופק במלואו! ✅`, {
      description: `הזמנה ${order_id} (${customer_name}) סופקה במלואה ע"י ${driver}`,
      duration: 6500,
    });
    void audioService.play("success");
  } else if (newStatus.includes("סופק")) {
    toast.success(`נועה עדכנה סטטוס: סופק ✅`, {
      description: `הזמנה ${order_id} (${customer_name}) עודכנה ל-סופק בגיליון ${SABAN_SHEET_TAB}`,
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
  } else if (newStatus.includes("בהכנה")) {
    toast(`נועה עדכנה סטטוס: בהכנה ⚙️`, {
      description: `הזמנה ${order_id} (${customer_name}) נכנסה להכנה בסידור`,
      duration: 5000,
    });
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
      const updatedList = [
        event,
        ...list.filter(
          (item) => item.order_id !== event.order_id || item.timestamp !== event.timestamp,
        ),
      ].slice(0, 25);
      localStorage.setItem(RECENT_UPDATES_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent("saban_order_status_updated", { detail: event }));
    } catch {
      /* ignore */
    }
  }
}

/**
 * הצגת התראת Toast בעברית בעת הקלדת הזמנה חדשה לגיליון
 */
export function notifyNewOrder(order: ScheduleOrder): void {
  toast.success(`נועה הקלידה הזמנה חדשה לגיליון! 📝`, {
    description: `הזמנה ${order.order_id} (${order.customer_name}) • ${order.round_time} • ${order.driver}`,
    duration: 6500,
  });
  void audioService.play("alert");

  if (typeof window !== "undefined") {
    try {
      const event: StatusNotificationEvent = {
        order_id: order.order_id,
        customer_name: order.customer_name,
        newStatus: order.status,
        driver: order.driver,
        warehouse: order.warehouse,
        timestamp: order.timestamp || new Date().toISOString(),
      };
      const stored = localStorage.getItem(RECENT_UPDATES_KEY);
      const list = stored ? (JSON.parse(stored) as StatusNotificationEvent[]) : [];
      const updatedList = [event, ...list].slice(0, 25);
      localStorage.setItem(RECENT_UPDATES_KEY, JSON.stringify(updatedList));
      window.dispatchEvent(new CustomEvent("saban_order_status_updated", { detail: event }));
    } catch {
      /* ignore */
    }
  }
}

/**
 * חישוב פקדונות אוטומטי קפדני לפי חוקי סבן
 * בלות: מק"ט 60002 (יחס 1:1 עבור חול, סומסום, טיט, חמרה)
 * משטחי סבן: מק"ט 60060 (משטח לכל 35-40 שקים)
 * משטחי בלוקים: מק"ט 60006
 * פטור: להובלות יבשות/ללא פריקה
 */
export function calculateDeposits(items: string): string {
  const parts: string[] = [];
  const lower = items.toLowerCase();

  // 1. בלות: מק"ט 60002 יחס 1:1
  const belaMatch = items.match(/(\d+)\s*(?:בלות|בלה|בלת)/);
  if (belaMatch) {
    const count = parseInt(belaMatch[1], 10);
    if (count > 0) {
      parts.push(`${count} בלות (מק"ט 60002)`);
    }
  } else if (lower.includes("בלה") || lower.includes("בלות")) {
    parts.push(`1 בלה (מק"ט 60002)`);
  }

  // 2. משטחי סבן: מק"ט 60060 (משטח לכל 35-40 שקים)
  const bagsMatch = items.match(/(\d+)\s*(?:שקים|שק|שקי)/);
  if (bagsMatch) {
    const bagsCount = parseInt(bagsMatch[1], 10);
    const pallets = Math.ceil(bagsCount / 38);
    if (pallets > 0) {
      parts.push(`${pallets} משטח סבן (מק"ט 60060)`);
    }
  }

  // 3. משטחי בלוקים: מק"ט 60006
  if (lower.includes("בלוק") || lower.includes("בלוקים")) {
    const blockPalletMatch = items.match(/(\d+)\s*(?:משטחי בלוק|משטחים בלוק|משטח בלוק)/);
    if (blockPalletMatch) {
      parts.push(`${blockPalletMatch[1]} משטחי בלוקים (מק"ט 60006)`);
    } else {
      parts.push(`משטח בלוקים (מק"ט 60006)`);
    }
  }

  if (parts.length === 0) {
    return "פטור (ללא פקדונות)";
  }
  return parts.join(", ");
}

/**
 * חילול קישור Waze
 */
export function generateWazeUrl(address: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(address.trim())}&navigate=yes`;
}

/**
 * חילול פעולת WhatsApp
 */
export function generateWhatsAppAction(driver: string): string {
  if (driver.includes("חכמת")) return "שדר לחכמת";
  if (driver.includes("עלי")) return "שדר לעלי";
  return `שדר ל-${driver}`;
}

/**
 * כלי 1: get_schedule_orders
 * שליפת שורות מגיליון דוח_בוקר_מבצעי
 */
export function get_schedule_orders(filters?: {
  filter_driver?: string;
  filter_status?: string;
  date?: string;
}): {
  sheet_id: string;
  tab_name: string;
  count: number;
  orders: ScheduleOrder[];
} {
  const allOrders = loadScheduleOrders();
  let result = [...allOrders];

  if (filters?.filter_driver) {
    const driverQuery = filters.filter_driver.toLowerCase();
    result = result.filter((o) => o.driver.toLowerCase().includes(driverQuery));
  }

  if (filters?.filter_status) {
    const statusQuery = filters.filter_status.toLowerCase();
    result = result.filter((o) => o.status.toLowerCase().includes(statusQuery));
  }

  if (filters?.date) {
    const dateQuery = filters.date.toLowerCase();
    result = result.filter(
      (o) =>
        o.round_time.toLowerCase().includes(dateQuery) ||
        (o.timestamp && o.timestamp.includes(dateQuery)),
    );
  }

  return {
    sheet_id: SABAN_SHEET_ID,
    tab_name: SABAN_SHEET_TAB,
    count: result.length,
    orders: result,
  };
}

/**
 * כלי 2: append_order_to_sheet
 * הקלדת שורת הזמנה חדשה לגיליון דוח_בוקר_מבצעי (עמודות A עד K)
 */
export function append_order_to_sheet(order_data: {
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
}): {
  success: boolean;
  message: string;
  order: ScheduleOrder;
  sheet_id: string;
  tab_name: string;
} {
  const currentOrders = loadScheduleOrders();

  // Normalize warehouse
  let normalizedWarehouse = order_data.warehouse;
  if (normalizedWarehouse.includes("החרש") || normalizedWarehouse.includes("4")) {
    normalizedWarehouse = "🏭 4️⃣(החרש)";
  } else if (normalizedWarehouse.includes("תלמיד") || normalizedWarehouse.includes("1")) {
    normalizedWarehouse = "🏟️ 1️⃣(התלמיד)";
  }

  // Normalize driver
  let normalizedDriver = order_data.driver;
  if (normalizedDriver.includes("חכמת") || normalizedDriver.includes("מנוף")) {
    normalizedDriver = "חכמת (מרצדס מנוף)";
  } else if (normalizedDriver.includes("עלי") || normalizedDriver.includes("איסוזו")) {
    normalizedDriver = "עלי (משאית איסוזו)";
  }

  // Calculate deposits if not provided
  const deposits = order_data.deposits?.trim()
    ? order_data.deposits
    : calculateDeposits(order_data.items);

  // Generate Waze URL
  const waze_url = order_data.waze_url?.trim()
    ? order_data.waze_url
    : generateWazeUrl(order_data.address);

  // Generate WhatsApp action
  const whatsapp_action = order_data.whatsapp_action?.trim()
    ? order_data.whatsapp_action
    : generateWhatsAppAction(normalizedDriver);

  const status = order_data.status?.trim() || "בסידור עבודה";

  // Ensure 7-digit order id
  let cleanOrderId = order_data.order_id.replace(/\D/g, "");
  if (!cleanOrderId) {
    cleanOrderId = String(6215700 + currentOrders.length + 1);
  }

  const newOrder: ScheduleOrder = {
    round_time: order_data.round_time,
    order_id: cleanOrderId,
    customer_name: order_data.customer_name,
    warehouse: normalizedWarehouse,
    address: order_data.address,
    driver: normalizedDriver,
    items: order_data.items,
    deposits,
    waze_url,
    status,
    whatsapp_action,
    timestamp: new Date().toISOString(),
  };

  const updatedOrders = [newOrder, ...currentOrders.filter((o) => o.order_id !== cleanOrderId)];
  saveScheduleOrders(updatedOrders);

  // Trigger Toast Notification in Hebrew to Rami
  notifyNewOrder(newOrder);

  // Push to backend script if endpoint configured
  const scriptEndpoint = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;
  if (scriptEndpoint && typeof navigator !== "undefined" && navigator.onLine) {
    void fetch(scriptEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "append_order_to_sheet",
        sheet_id: SABAN_SHEET_ID,
        tab_name: SABAN_SHEET_TAB,
        order: newOrder,
      }),
    }).catch(() => {
      /* best effort */
    });
  }

  return {
    success: true,
    message: "ההזמנה נקלטה והוקלדה בהצלחה לשורה חדשה בגיליון נועה!",
    order: newOrder,
    sheet_id: SABAN_SHEET_ID,
    tab_name: SABAN_SHEET_TAB,
  };
}

/**
 * כלי 3: update_order_in_sheet
 * עדכון סטטוס / שיבוץ נהג / פרטי הזמנה קיימת
 */
export function update_order_in_sheet(
  order_id: string,
  updates: {
    status?: string;
    driver?: string;
    notes?: string;
    warehouse?: string;
    round_time?: string;
  },
): {
  success: boolean;
  message: string;
  order: ScheduleOrder | null;
  sheet_id: string;
  tab_name: string;
} {
  const currentOrders = loadScheduleOrders();
  const cleanId = order_id.replace(/\D/g, "");
  const targetIndex = currentOrders.findIndex(
    (o) => o.order_id === cleanId || o.order_id === order_id,
  );

  if (targetIndex === -1) {
    return {
      success: false,
      message: `הזמנה מספר ${order_id} לא נמצאה בגיליון הסידור.`,
      order: null,
      sheet_id: SABAN_SHEET_ID,
      tab_name: SABAN_SHEET_TAB,
    };
  }

  const existing = currentOrders[targetIndex];
  let updatedDriver = existing.driver;
  if (updates.driver) {
    if (updates.driver.includes("חכמת")) updatedDriver = "חכמת (מרצדס מנוף)";
    else if (updates.driver.includes("עלי")) updatedDriver = "עלי (משאית איסוזו)";
    else updatedDriver = updates.driver;
  }

  const updatedStatus = updates.status || existing.status;
  const statusChanged = Boolean(updates.status && updates.status !== existing.status);
  const driverChanged = Boolean(updates.driver && updatedDriver !== existing.driver);

  const updatedOrder: ScheduleOrder = {
    ...existing,
    driver: updatedDriver,
    status: updatedStatus,
    round_time: updates.round_time || existing.round_time,
    whatsapp_action: updates.driver
      ? generateWhatsAppAction(updatedDriver)
      : existing.whatsapp_action,
  };

  currentOrders[targetIndex] = updatedOrder;
  saveScheduleOrders(currentOrders);

  // Trigger Toast Notification in Hebrew for Rami in real time
  if (statusChanged) {
    notifyStatusChange({
      order_id: cleanId,
      customer_name: existing.customer_name,
      oldStatus: existing.status,
      newStatus: updatedStatus,
      driver: updatedDriver,
      warehouse: existing.warehouse,
      timestamp: new Date().toISOString(),
    });
  } else if (driverChanged) {
    toast(`נועה עדכנה שיבוץ נהג בגיליון 🔄`, {
      description: `הזמנה ${cleanId} (${existing.customer_name}) הועברה ל-${updatedDriver}`,
      duration: 6000,
    });
    void audioService.play("alert");
  }

  // Push update to Google Sheets endpoint if live
  const scriptEndpoint = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;
  if (scriptEndpoint && typeof navigator !== "undefined" && navigator.onLine) {
    void fetch(scriptEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "update_order_in_sheet",
        sheet_id: SABAN_SHEET_ID,
        tab_name: SABAN_SHEET_TAB,
        order_id: cleanId,
        updates,
      }),
    }).catch(() => {
      /* best effort */
    });
  }

  return {
    success: true,
    message: `הזמנה ${cleanId} עודכנה בהצלחה בגיליון דוח_בוקר_מבצעי!`,
    order: updatedOrder,
    sheet_id: SABAN_SHEET_ID,
    tab_name: SABAN_SHEET_TAB,
  };
}
