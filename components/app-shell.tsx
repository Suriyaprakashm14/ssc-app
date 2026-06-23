"use client";

import { BarChart3, BookOpen, CheckSquare, Home, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnalyticsView } from "@/components/analytics-view";
import { Dashboard } from "@/components/dashboard";
import { ProfileView } from "@/components/profile-view";
import { StudyConsole } from "@/components/study-console";
import { SyllabusView } from "@/components/syllabus-view";
import { TaskList } from "@/components/task-list";
import { buildSSCExam } from "@/lib/exam-engine";
import { useExamConfigStore } from "@/store/exam-config-store";
import { useWarRoomStore } from "@/store/war-room-store";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "study", label: "Study", icon: BookOpen },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "syllabus", label: "Syllabus", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

type Tab = (typeof tabs)[number]["id"];

export function AppShell() {
  const [tab, setTab] = useState<Tab>("home");
  const [mounted, setMounted] = useState(false);
  const { config, loading, error, loadConfig } = useExamConfigStore();
  const configureExam = useWarRoomStore((state) => state.configureExam);
  const cloudReady = useWarRoomStore((state) => state.cloudReady);
  const exam = useMemo(() => config ? buildSSCExam(config) : undefined, [config]);

  useEffect(() => {
    setMounted(true);
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (exam && cloudReady) configureExam(exam);
  }, [cloudReady, configureExam, exam]);

  const page = exam ? {
    home: <Dashboard goTo={setTab} />,
    study: <StudyConsole />,
    tasks: <TaskList exam={exam} goToStudy={() => setTab("study")} />,
    syllabus: <SyllabusView exam={exam} />,
    analytics: <AnalyticsView exam={exam} />,
    profile: <ProfileView exam={exam} />,
  }[tab] : undefined;

  const content = !mounted || loading || !cloudReady
    ? <div className="card text-sm text-slate-400">Loading study workspace…</div>
    : error
      ? <div className="card text-sm font-semibold text-rose-300">{error}</div>
      : page ?? <div className="card text-sm text-slate-400">Loading study workspace…</div>;

  return <main className="mx-auto min-h-screen max-w-5xl pb-24">
    <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/85 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div><p className="text-xs font-bold tracking-[.22em] text-emerald-300">SSC WAR ROOM</p><p className="text-xs text-slate-400">Study command center</p></div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">MISSION ACTIVE</span>
      </div>
    </header>
    <section className="px-4 pt-4">{content}</section>
    <nav className="glass fixed bottom-0 left-0 right-0 z-30 border-x-0 border-b-0">
      <div className="mx-auto grid max-w-5xl grid-cols-6">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-[10px] font-semibold ${tab === id ? "text-emerald-300" : "text-slate-500"}`}><Icon size={19} strokeWidth={tab === id ? 2.6 : 2} />{label}</button>)}
      </div>
    </nav>
  </main>;
}
