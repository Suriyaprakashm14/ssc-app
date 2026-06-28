"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Brain, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { missionMetrics } from "@/lib/exam-engine";
import { generateCoachReport } from "@/services/coach-service";
import { useWarRoomStore } from "@/store/war-room-store";
import type { CoachReport, ExamDefinition, MockTest } from "@/types";

const palette = ["#60a5fa", "#c084fc", "#fbbf24", "#fb7185", "#75e6b2", "#34d399", "#f97316"];

export function AnalyticsView({ exam }: { exam: ExamDefinition }) {
  const { mission, sessions, tasks, daily, mocks, addMock, distractions } = useWarRoomStore();
  const [showMock, setShowMock] = useState(false);
  const [report, setReport] = useState<CoachReport>();
  const [loading, setLoading] = useState(false);
  const subjectData = useMemo(() => exam.subjects.map((subject, index) => {
    const subjectTasks = tasks.filter((task) => task.subjectId === subject.id);
    const completed = subjectTasks.filter((task) => task.status === "completed").length;
    const minutes = Math.round(sessions.filter((session) => session.subjectId === subject.id).reduce((total, session) => total + session.effectiveSeconds, 0) / 60);
    return {
      name: shortName(subject.name),
      minutes,
      completed,
      pending: subjectTasks.filter((task) => task.status !== "completed" && task.status !== "skipped").length,
      progress: subjectTasks.length ? Math.round((completed / subjectTasks.length) * 100) : 0,
      color: palette[index % palette.length],
    };
  }), [exam, sessions, tasks]);
  const distractionData = useMemo(() => {
    const totals = new Map<string, number>();
    distractions.forEach((item) => totals.set(item.category, (totals.get(item.category) ?? 0) + item.durationMinutes));
    return Array.from(totals.entries()).map(([name, minutes], index) => ({ name, minutes, color: palette[index % palette.length] }));
  }, [distractions]);
  const totalMinutes = subjectData.reduce((total, item) => total + item.minutes, 0);
  const completed = tasks.filter((task) => task.status === "completed").length;
  const pending = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").length;
  const distractionMinutes = distractionData.reduce((total, item) => total + item.minutes, 0);

  const requestReport = async () => {
    setLoading(true);
    try {
      setReport(await generateCoachReport({ tasks, studyMinutesWeek: totalMinutes, distractionMinutesWeek: daily.distractionMinutes, missionDaysRemaining: missionMetrics(mission, tasks, 0, 0).daysRemaining }));
    } finally {
      setLoading(false);
    }
  };

  return <div className="space-y-4">
    <div className="flex items-end justify-between gap-3">
      <div><p className="label">Performance intelligence</p><h1 className="text-2xl font-black">Analytics & mocks</h1></div>
      <button className="btn-primary !px-3 !py-2" onClick={() => setShowMock(!showMock)}><Plus size={16} />Mock</button>
    </div>

    {showMock && <MockEntry onSave={(mock) => { addMock(mock); setShowMock(false); }} />}

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile value={`${totalMinutes}m`} label="Tracked focus" />
      <Tile value={`${completed}`} label="Tasks done" />
      <Tile value={`${pending}`} label="Pending tasks" />
      <Tile value={`${distractionMinutes}m`} label="Distractions" />
    </div>

    <section className="card">
      <p className="label">Subject focus</p>
      <p className="mt-1 text-sm text-slate-400">All subjects are shown, even if the timer has not recorded minutes yet.</p>
      <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={subjectData}><XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} /><YAxis hide /><Tooltip contentStyle={{ background: "#111827", border: "1px solid #334155", borderRadius: 8 }} /><Bar dataKey="minutes" name="Minutes" radius={[8, 8, 0, 0]}>{subjectData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer></div>
    </section>

    <section className="card">
      <p className="label">Subject completion</p>
      <div className="mt-3 space-y-3">
        {subjectData.map((item) => <div key={item.name}>
          <div className="flex justify-between text-xs"><span className="font-semibold text-slate-200">{item.name}</span><span className="text-slate-400">{item.completed} done · {item.pending} pending</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${item.progress}%`, background: item.color }} /></div>
        </div>)}
      </div>
    </section>

    <section className="card">
      <p className="label">Distraction analytics</p>
      {distractionData.length ? <div className="mt-3 flex items-center gap-3">
        <div className="h-36 w-36 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distractionData} dataKey="minutes" innerRadius={40} outerRadius={62} paddingAngle={3}>{distractionData.map((entry) => <Cell fill={entry.color} key={entry.name} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        <div className="space-y-2">{distractionData.map((item) => <div className="flex items-center gap-2 text-xs" key={item.name}><span className="h-2 w-2 rounded-full" style={{ background: item.color }} /><span className="text-slate-300">{item.name}</span><span className="font-bold text-slate-100">{item.minutes}m</span></div>)}</div>
      </div> : <p className="mt-2 text-sm text-slate-400">No distractions logged yet. Add them from Profile to see category balance here.</p>}
      <p className="mt-3 text-xs text-slate-500">Today: {daily.distractionMinutes}m distraction · {daily.overthinkingMinutes}m overthinking · sleep {daily.sleepHours ?? "not logged"}h</p>
    </section>

    <section className="card">
      <div className="flex items-center gap-2"><Brain className="text-violet-300" size={19} /><div><p className="label">AI analytics</p><p className="font-bold">Workload, weakness, revision & burnout analysis</p></div></div>
      {report ? <div className="mt-3 space-y-2 text-sm text-slate-300"><p>{report.summary}</p><p><span className="font-bold text-emerald-300">Tomorrow:</span> {report.tomorrowPlan.join(" · ") || "No plan generated"}</p><p><span className="font-bold text-amber-300">Burnout risk:</span> {report.burnoutRisk}</p></div> : <p className="mt-2 text-sm text-slate-400">Generate an aggregated report from real task, timer, mock, and distraction metrics.</p>}
      <button className="btn-primary mt-4 w-full" disabled={loading} onClick={requestReport}><Sparkles size={16} />{loading ? "Analysing..." : "Generate AI analytics"}</button>
    </section>

    {mocks.length > 0 && <section className="card"><p className="label">Mock history</p>{mocks.map((mock) => <div className="mt-3 rounded-xl bg-white/5 p-3" key={mock.id}><div className="flex justify-between"><p className="font-bold">{mock.name}</p><p className="text-emerald-300">{mock.score}</p></div><p className="mt-1 text-xs text-slate-400">{mock.accuracy}% accuracy · {mock.attempts} attempts · {mock.timeTakenMinutes}m · {mock.date}</p></div>)}</section>}
  </div>;
}

function shortName(name: string) {
  return name.replace("Quantitative Aptitude", "Quant").replace("General Intelligence & Reasoning", "Reasoning").replace("English Language & Comprehension", "English").replace("General Awareness", "GA").replace("Computer Knowledge", "Computer");
}

function MockEntry({ onSave }: { onSave: (mock: MockTest) => void }) {
  const [name, setName] = useState("SSC CGL Mock");
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  return <section className="card"><p className="font-bold">Attended mock entry</p><div className="mt-3 grid grid-cols-2 gap-3"><Field label="Mock name" value={name} setValue={setName} className="col-span-2" /><Field label="Score" value={score} setValue={(value) => setScore(Number(value))} type="number" /><Field label="Accuracy %" value={accuracy} setValue={(value) => setAccuracy(Number(value))} type="number" /><Field label="Attempts" value={attempts} setValue={(value) => setAttempts(Number(value))} type="number" /><Field label="Time taken (min)" value={timeTaken} setValue={(value) => setTimeTaken(Number(value))} type="number" /></div><button className="btn-primary mt-4 w-full" disabled={!name || score < 0 || accuracy < 0} onClick={() => onSave({ id: crypto.randomUUID(), name, score, accuracy, attempts, date: new Date().toISOString().slice(0, 10), timeTakenMinutes: timeTaken, subjectScores: {}, weakTopics: [], strongTopics: [], mistakes: "" })}>Save attended mock</button></section>;
}

function Field({ label, value, setValue, type = "text", className = "" }: { label: string; value: string | number; setValue: (value: string) => void; type?: string; className?: string }) {
  return <label className={`label ${className}`}>{label}<input className="input" value={value} type={type} onChange={(event) => setValue(event.target.value)} /></label>;
}

function Tile({ value, label }: { value: string; label: string }) {
  return <div className="card p-3"><p className="text-xl font-black text-emerald-300">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>;
}
