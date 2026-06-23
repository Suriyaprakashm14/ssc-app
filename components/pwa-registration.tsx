"use client";
import { useEffect } from "react";

if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID !== "function") {
  try {
    Object.defineProperty(globalThis.crypto, "randomUUID", { configurable: true, value: () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}` });
  } catch { /* Older webviews can use the compatible IDs emitted by lib/id.ts. */ }
}

export function PwaRegistration() {
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  return null;
}
