"use client";

import { ArrowRight, Brain, CheckCircle2, Clock3, Flame, Sparkles, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { missionMetrics, minutesUntil, studyStreak } from "@/lib/exam-engine";
import { generateCoachReport } from "@/services/coach-service";
import { useWarRoomStore } from "@/store/war-room-store";
import type { StudyTask } from "@/types";

type Tab = "home" | "study" | "tasks" | "syllabus" | "analytics" | "profile";

const formatCountdown = (totalMinutes: number) => {
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
};

export function Dashboard({ goTo }: { goTo: (tab: Tab) => void }) {
  const { mission, tasks, sessions, daily } = useWarRoomStore();
  const [coach, setCoach] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const minutesToday = useMemo(() => Math.round(sessions
    .filter((session) => session.startedAt.slice(0, 10) === new Date(now).toISOString().slice(0, 10))
    .reduce((total, session) => total + session.effectiveSeconds, 0) / 60), [now, sessions]);
  const metrics = missionMetrics(mission, tasks, minutesToday, studyStreak(sessions));
  const targetDailyHours = mission?.targetHours && mission.targetHours <= 24 ? mission.targetHours : Math.max(1, Math.round(metrics.targetMinutesToday / 60));
  const minutesLeft = mission ? minutesUntil(mission.examDate, new Date(now)) : 0;
  const missionStart = mission ? new Date(mission.startedAt).getTime() : now;
  const missionEnd = mission ? new Date(mission.examDate).getTime() : now;
  const timeProgress = missionEnd > missionStart ? Math.min(100, Math.max(0, ((now - missionStart) / (missionEnd - missionStart)) * 100)) : 0;
  const current = tasks.find((task) => task.status === "in_progress") ?? tasks.find((task) => task.status === "pending");
  const mustCover = selectMustCover(tasks);
  const trend = sessions.slice(0, 7).reverse().map((session, index) => ({ day: `D${index + 1}`, minutes: Math.round(session.effectiveSeconds / 60) }));

  const requestCoach = async () => {
    setLoading(true);
    try {
      const report = await generateCoachReport({ tasks, studyMinutesWeek: sessions.reduce((total, session) => total + session.effectiveSeconds, 0) / 60, distractionMinutesWeek: daily.distractionMinutes, missionDaysRemaining: metrics.daysRemaining });
      setCoach(`${report.summary} ${report.tomorrowPlan.join(" · ")}`);
    } catch (error) {
      setCoach(error instanceof Error ? error.message : "Coach unavailable");
    } finally {
      setLoading(false);
    }
  };

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-emerald-300/20 via-slate-900 to-slate-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label text-emerald-200">{mission?.examName ?? "Choose exam"}</p>
          <h1 className="mt-1 font-mono text-3xl font-black text-emerald-200">{formatCountdown(minutesLeft)}</h1>
          <p className="mt-1 text-sm text-slate-300">{minutesLeft.toLocaleString()} minutes remaining to exam day.</p>
        </div>
        <Target className="shrink-0 text-emerald-300" size={32} />
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${timeProgress}%` }} /></div>
      <div className="mt-2 flex justify-between text-xs text-slate-300"><span>{Math.round(timeProgress)}% time used</span><span>{metrics.missionProgress}% syllabus task progress</span></div>
    </section>

    {mustCover.length > 0 && <section className="card">
      <div className="flex items-center justify-between gap-3">
        <div><p className="label">Definitely cover next</p><p className="font-bold">Mixed high-impact topics for the next study block</p></div>
        <button className="btn-quiet !px-3 !py-2" onClick={() => goTo("tasks")}>Tasks</button>
      </div>
      <div className="mt-3 grid gap-2">
        {mustCover.map((task) => <button key={task.id} className="rounded-xl bg-white/5 px-3 py-2 text-left text-sm font-semibold" onClick={() => goTo("tasks")}>{task.title}</button>)}
      </div>
    </section>}

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Metric label="Today" value={`${metrics.completedMinutesToday}m`} icon={Clock3} />
      <Metric label="Target/day" value={`${targetDailyHours}h`} icon={Target} />
      <Metric label="Streak" value={`${metrics.streak} days`} icon={Flame} />
      <Metric label="Revisions" value={String(metrics.dueRevisions)} icon={CheckCircle2} />
    </section>

    {current && <button onClick={() => goTo("study")} className="card w-full text-left">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Current priority</p>
          <p className="mt-1 font-bold">{current.title}</p>
          <p className="mt-1 text-sm text-slate-400">{current.plannedMinutes} minutes · {current.priority}</p>
        </div>
        <ArrowRight className="text-emerald-300" />
      </div>
    </button>}

    <section className="card">
      <p className="label">Weekly focus</p>
      <div className="mt-3 h-32">{trend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: "#111827", border: "1px solid #334155", borderRadius: 12 }} /><Area type="monotone" dataKey="minutes" stroke="#75e6b2" fill="#75e6b233" /></AreaChart></ResponsiveContainer> : <p className="pt-10 text-center text-sm text-slate-400">End a task timer to record focus time.</p>}</div>
    </section>

    <section className="card">
      <div className="flex items-center gap-2"><Brain className="text-violet-300" size={20} /><div><p className="label">AI coach</p><p className="font-bold">Aggregated study analysis</p></div></div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{coach ?? "Uses completed task timer sessions, task load, and distraction totals. It does not receive raw timer logs."}</p>
      <button onClick={requestCoach} disabled={loading} className="btn-primary mt-4 w-full"><Sparkles size={16} />{loading ? "Analysing..." : "Generate tomorrow's plan"}</button>
    </section>
  </div>;
}

function selectMustCover(tasks: StudyTask[]) {
  const seen = new Set<string>();
  return tasks
    .filter((task) => task.status !== "completed" && task.status !== "skipped")
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.dueDate.localeCompare(b.dueDate))
    .filter((task) => {
      if (seen.has(task.topicId)) return false;
      seen.add(task.topicId);
      return true;
    })
    .slice(0, 5);
}

function priorityRank(priority: StudyTask["priority"]) {
  return priority === "critical" ? 4 : priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock3 }) {
  return <div className="card p-3"><Icon size={17} className="text-emerald-300" /><p className="mt-3 text-lg font-black">{value}</p><p className="text-xs text-slate-400">{label}</p></div>;
}
