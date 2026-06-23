"use client";

import { useEffect } from "react";
import { logout } from "@/services/auth-service";

export function LogoutPage() {
  useEffect(() => {
    void logout().finally(() => window.location.replace("/login"));
  }, []);

  return <main className="grid min-h-screen place-items-center bg-ink p-4"><section className="card text-sm text-slate-400">Signing out…</section></main>;
}
