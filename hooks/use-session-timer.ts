"use client";
import { useEffect, useState } from "react";
export function useSessionTimer(startedAt?: number, running = false) { const [now, setNow] = useState(Date.now()); useEffect(() => { if (!running) return; const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, [running]); return startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0; }
