/**
 * Local Memory Engine — IndexedDB storage with an automatic localStorage
 * fallback. Handles offline records, a pending-action queue and audit logs.
 */

export type InterfaceName = "Documents" | "Locations" | "Orders" | "AuditLogs";

export interface SyncRecord {
  id: string;
  timestamp: string;
  interfaceName: InterfaceName;
  driveFolderReference: string;
  sheetRowId: string | null;
  status: "pending" | "synced" | "failed";
  title: string;
  note?: string;
  payload?: Record<string, unknown>;
}

export interface PendingAction {
  id: string;
  type: "create" | "update";
  recordId: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const DB_NAME = "luxe-local-memory";
const DB_VERSION = 1;
const STORES = ["records", "queue", "logs"] as const;
export type StoreName = (typeof STORES)[number];

const isBrowser = () => typeof window !== "undefined";

function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser() || !("indexedDB" in window)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function lsKey(store: StoreName) {
  return `${DB_NAME}:${store}`;
}

function lsRead<T>(store: StoreName): T[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(lsKey(store)) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function lsWrite<T>(store: StoreName, rows: T[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(lsKey(store), JSON.stringify(rows));
  } catch {
    /* quota exceeded — ignore */
  }
}

export async function readAll<T extends { id: string }>(store: StoreName): Promise<T[]> {
  const db = await openDb();
  if (!db) return lsRead<T>(store);
  return new Promise((resolve) => {
    const request = db.transaction(store, "readonly").objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => resolve(lsRead<T>(store));
  });
}

export async function put<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  const db = await openDb();
  if (!db) {
    const rows = lsRead<T>(store).filter((row) => row.id !== value.id);
    lsWrite(store, [...rows, value]);
    return;
  }
  await new Promise<void>((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await openDb();
  if (!db) {
    lsWrite(
      store,
      lsRead<{ id: string }>(store).filter((row) => row.id !== id),
    );
    return;
  }
  await new Promise<void>((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export function newId() {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  message: string;
  level: "info" | "warn" | "error";
}

export async function log(message: string, level: AuditLog["level"] = "info") {
  await put<AuditLog>("logs", { id: newId(), timestamp: new Date().toISOString(), message, level });
}

export async function enqueue(action: Omit<PendingAction, "id" | "createdAt">) {
  const entry: PendingAction = { ...action, id: newId(), createdAt: new Date().toISOString() };
  await put("queue", entry);
  return entry;
}

export async function drainQueue(
  handler: (action: PendingAction) => Promise<boolean>,
): Promise<number> {
  const actions = await readAll<PendingAction>("queue");
  let done = 0;
  for (const action of actions) {
    const ok = await handler(action);
    if (ok) {
      await remove("queue", action.id);
      done += 1;
    }
  }
  return done;
}
