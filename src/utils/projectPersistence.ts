import type { Slide, GridStyle, BoardTheme } from "../types/whiteboard";

export interface TapboardProjectData {
  version: 1;
  appName: "Tapboard";
  title: string;
  slides: Slide[];
  currentSlideIndex: number;
  gridStyle: GridStyle;
  boardTheme?: BoardTheme;
  isFiniteMode: boolean;
  exportedAt: string;
}

const DB_NAME = "tapboard_db";
const DB_VERSION = 1;
const STORE_NAME = "active_lecture";
const KEY_CURRENT = "current_lecture";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Auto-saves lecture state to IndexedDB in background
 */
export async function saveLectureToStorage(data: Omit<TapboardProjectData, "version" | "appName" | "exportedAt">): Promise<void> {
  try {
    const db = await openDB();
    const payload: TapboardProjectData = {
      ...data,
      version: 1,
      appName: "Tapboard",
      exportedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload, KEY_CURRENT);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Tapboard] Failed to auto-save to IndexedDB:", err);
  }
}

/**
 * Loads last active lecture from IndexedDB if available
 */
export async function loadLectureFromStorage(): Promise<TapboardProjectData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_CURRENT);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Tapboard] Failed to load from IndexedDB:", err);
    return null;
  }
}

/**
 * Clears cached lecture from IndexedDB
 */
export async function clearLectureStorage(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_CURRENT);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[Tapboard] Failed to clear IndexedDB:", err);
  }
}

/**
 * Serializes and triggers download of a .tapboard project file
 */
export function exportTapboardFile(data: Omit<TapboardProjectData, "version" | "appName" | "exportedAt">): void {
  const payload: TapboardProjectData = {
    ...data,
    version: 1,
    appName: "Tapboard",
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const safeTitle = data.title.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "lecture";
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeTitle}_${dateStr}.tapboard`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses an uploaded .tapboard project file
 */
export async function parseTapboardFile(file: File): Promise<TapboardProjectData> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  if (!parsed || (parsed.appName !== "Tapboard" && !parsed.slides)) {
    throw new Error("Invalid .tapboard project file format.");
  }

  return {
    version: 1,
    appName: "Tapboard",
    title: parsed.title || "Untitled Lecture",
    slides: parsed.slides || [],
    currentSlideIndex: parsed.currentSlideIndex || 0,
    gridStyle: parsed.gridStyle || "dots",
    isFiniteMode: Boolean(parsed.isFiniteMode),
    exportedAt: parsed.exportedAt || new Date().toISOString(),
  };
}
