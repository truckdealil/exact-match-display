/**
 * ==============================================================================
 * ח. סבן חומרי בניין (1994) בע״מ | גשר Google Sheets & Apps Script
 * ==============================================================================
 *
 * חיבור ישיר לגיליון מערכת מאוחדת (1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c)
 * וגיליון נועה AI בענן ללא נתוני דמה (Zero Mock Data).
 */

import { newId, put, readAll, remove, enqueue, type SyncRecord } from "@/lib/storage";

export const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwAkBK1Z051WmTvyDsRNrUf3xAS0MOCio9QRdoGyYxQdN66AekWhG_YFAgmKNEl7mR_/exec";

export const DEFAULT_APPS_SCRIPT_TOKEN = "saban_secret_token_2026";
export const UNIFIED_SPREADSHEET_ID = "1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c";
export const NOA_AI_SPREADSHEET_ID = "1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA";

export function getAppsScriptEndpoint(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("saban_custom_apps_script_url");
    if (custom && custom.trim().startsWith("http")) return custom.trim();
  }
  return (
    (import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined) ||
    DEFAULT_APPS_SCRIPT_URL
  );
}

export function getAppsScriptToken(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("saban_custom_apps_script_token");
    if (custom && custom.trim()) return custom.trim();
  }
  return (
    (import.meta.env["VITE_APPS_SCRIPT_TOKEN"] as string | undefined) || DEFAULT_APPS_SCRIPT_TOKEN
  );
}

export const isSheetsConfigured = () => Boolean(getAppsScriptEndpoint());

export async function checkSheetsCloudConnection(): Promise<{
  connected: boolean;
  message: string;
  sheets?: string[];
  timestamp?: string;
}> {
  const endpoint = getAppsScriptEndpoint();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${endpoint}?action=ping`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return {
        connected: false,
        message: `שגיאת שרת ענן: ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      success?: boolean;
      status?: string;
      business?: string;
      sheets?: string[];
      timestamp?: string;
    };
    return {
      connected: data.success === true || data.status === "online",
      message:
        data.success || data.status === "online"
          ? "מחובר לגיליון מערכת מאוחדת בענן (ח. סבן)"
          : "התקבלה תשובה אך ללא אימות תקין",
      sheets: data.sheets,
      timestamp: data.timestamp,
    };
  } catch {
    return {
      connected: false,
      message: "הענן אינו מגיב (סנכרון במצב שטח מקומי)",
    };
  }
}

/**
 * מחיקת כל נתוני הדמה הישנים מהזיכרון המקומי
 */
export async function purgeMockRecords(): Promise<number> {
  let count = 0;
  try {
    const cached = await readAll<SyncRecord>("records");
    for (const record of cached) {
      if (
        record.id.startsWith("rec-100") ||
        record.title.includes("משלוח צפון") ||
        record.title.includes("נהג 12") ||
        record.title.includes("9931")
      ) {
        await remove("records", record.id);
        count++;
      }
    }
  } catch {
    /* ignore */
  }
  return count;
}

/**
 * שליפת רשומות אמיתיות מהגיליון בענן והמרתן למבנה SyncRecord עבור הממשק
 */
export async function fetchRecords(): Promise<SyncRecord[]> {
  // First, purge any legacy demo mock records
  await purgeMockRecords();

  const endpoint = getAppsScriptEndpoint();
  const token = getAppsScriptToken();

  if (endpoint) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Query real orders from Google Apps Script
      const res = await fetch(
        `${endpoint}?action=getOrders&token=${encodeURIComponent(token)}&sheetId=${UNIFIED_SPREADSHEET_ID}&tab=${encodeURIComponent("הזמנות")}`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = (await res.json()) as {
          success?: boolean;
          orders?: Array<Record<string, unknown>>;
        };

        if (json.orders && Array.isArray(json.orders) && json.orders.length > 0) {
          const liveRecords: SyncRecord[] = json.orders.map((raw, idx) => {
            const orderId = String(
              raw["מספר הזמנה"] || raw["order_id"] || raw["OrderId"] || `ORD-${1000 + idx}`,
            );
            const customer = String(
              raw["שם לקוח"] || raw["customer_name"] || raw["CustName"] || "לקוח",
            );
            const status = String(raw["סטטוס ביצוע"] || raw["status"] || "בסידור");
            const driver = String(raw["נהג משובץ"] || raw["driver"] || "לשיבוץ");
            const items = String(
              raw["פירוט מוצרים וכמויות"] || raw["items"] || raw["ItemsSummary"] || "",
            );
            const address = String(raw["כתובת יעד ועיר"] || raw["address"] || "");

            const isDone = status.includes("סופק");

            return {
              id: orderId,
              timestamp: new Date().toISOString(),
              interfaceName: "Orders",
              driveFolderReference: `Drive/Orders/Saban-2026`,
              sheetRowId: `row-${idx + 2}`,
              status: isDone ? "synced" : "pending",
              title: `הזמנה #${orderId} — ${customer}`,
              note: `${driver} | ${items} | ${address}`,
              payload: raw,
            };
          });

          // Save live records to storage
          for (const row of liveRecords) {
            await put("records", row);
          }

          return liveRecords;
        }
      }
    } catch (err) {
      console.warn("Could not fetch records directly from Apps Script:", err);
    }
  }

  // Fallback to real cached records (without mock demo records)
  const cached = await readAll<SyncRecord>("records");
  const filtered = cached.filter((r) => !r.id.startsWith("rec-100"));
  return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function createRecord(
  data: Pick<SyncRecord, "title" | "interfaceName"> & Partial<SyncRecord>,
): Promise<SyncRecord> {
  const record: SyncRecord = {
    id: newId(),
    timestamp: new Date().toISOString(),
    driveFolderReference: `Drive/${data.interfaceName}/${new Date().toISOString().slice(0, 7)}`,
    sheetRowId: null,
    status: "pending",
    ...data,
  };
  await put("records", record);
  await pushOrQueue("create", record.id, record as unknown as Record<string, unknown>);
  return record;
}

export async function updateRecord(
  id: string,
  data: Partial<SyncRecord>,
): Promise<SyncRecord | null> {
  const rows = await readAll<SyncRecord>("records");
  const existing = rows.find((row) => row.id === id);
  if (!existing) return null;
  const next = { ...existing, ...data, timestamp: new Date().toISOString() };
  await put("records", next);
  await pushOrQueue("update", id, data as Record<string, unknown>);
  return next;
}

async function pushOrQueue(
  type: "create" | "update",
  recordId: string,
  data: Record<string, unknown>,
) {
  const endpoint = getAppsScriptEndpoint();
  const online = typeof navigator === "undefined" ? false : navigator.onLine;
  if (!endpoint || !online) {
    await enqueue({ type, recordId, data });
    return;
  }
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: type,
        id: recordId,
        token: getAppsScriptToken(),
        data,
      }),
    });
  } catch {
    await enqueue({ type, recordId, data });
  }
}
