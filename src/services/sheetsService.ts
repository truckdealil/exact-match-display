/**
 * Google Sheets bridge — talks to a Google Apps Script Web App endpoint.
 * Set VITE_GOOGLE_APPS_SCRIPT_URL to go live; until then the service serves
 * locally cached demo records so the UI stays fully usable offline.
 */

import { newId, put, readAll, enqueue, type SyncRecord } from "@/lib/storage";

const ENDPOINT = import.meta.env["VITE_GOOGLE_APPS_SCRIPT_URL"] as string | undefined;

export const isSheetsConfigured = () => Boolean(ENDPOINT);

const DEMO: SyncRecord[] = [
  {
    id: "rec-1001",
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    interfaceName: "Orders",
    driveFolderReference: "Drive/Orders/2026-09",
    sheetRowId: "row-21",
    status: "synced",
    title: "הזמנה #4821 — משלוח צפון",
    note: "אושר על ידי מוקד הפצה",
  },
  {
    id: "rec-1002",
    timestamp: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
    interfaceName: "Locations",
    driveFolderReference: "Drive/Locations/2026-09",
    sheetRowId: "row-22",
    status: "synced",
    title: "דיווח מיקום — נהג 12",
  },
  {
    id: "rec-1003",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    interfaceName: "Documents",
    driveFolderReference: "Drive/Documents/2026-09",
    sheetRowId: null,
    status: "pending",
    title: "תעודת משלוח 9931",
    note: "ממתין לסנכרון",
  },
  {
    id: "rec-1004",
    timestamp: new Date(Date.now() - 1000 * 60 * 260).toISOString(),
    interfaceName: "AuditLogs",
    driveFolderReference: "Drive/AuditLogs/2026-09",
    sheetRowId: "row-24",
    status: "failed",
    title: "כשל בסנכרון גיליון",
    note: "נסיון חוזר אוטומטי",
  },
];

async function ensureSeed(): Promise<SyncRecord[]> {
  const cached = await readAll<SyncRecord>("records");
  if (cached.length) return cached;
  for (const record of DEMO) await put("records", record);
  return DEMO;
}

export async function fetchRecords(): Promise<SyncRecord[]> {
  if (ENDPOINT) {
    try {
      const response = await fetch(`${ENDPOINT}?action=list`);
      if (!response.ok) throw new Error(`Sheets responded ${response.status}`);
      const rows = (await response.json()) as SyncRecord[];
      for (const row of rows) await put("records", row);
      return rows;
    } catch {
      /* fall through to the local cache when offline */
    }
  }
  const rows = await ensureSeed();
  return rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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
  const online = typeof navigator === "undefined" ? false : navigator.onLine;
  if (!ENDPOINT || !online) {
    await enqueue({ type, recordId, data });
    return;
  }
  try {
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: type, id: recordId, data }),
    });
  } catch {
    await enqueue({ type, recordId, data });
  }
}
