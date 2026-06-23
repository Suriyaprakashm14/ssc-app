"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("@/components/app-shell").then((module) => module.AppShell), {
  ssr: false,
  loading: () => <main className="mx-auto min-h-screen max-w-5xl pb-24"><section className="px-4 pt-4"><div className="card text-sm text-slate-400">Loading study workspace…</div></section></main>,
});

export function AppShellLoader() {
  return <AppShell />;
}
