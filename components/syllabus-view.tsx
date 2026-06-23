"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useWarRoomStore } from "@/store/war-room-store";
import type { ExamDefinition } from "@/types";

export function SyllabusView({ exam }: { exam: ExamDefinition }) {
  const { tasks } = useWarRoomStore();
  const [open, setOpen] = useState(exam.subjects[0]?.id ?? "");
  return <div className="space-y-4"><div><p className="label">Dynamic exam engine</p><h1 className="text-2xl font-black">{exam.name} syllabus</h1><p className="mt-1 text-sm text-slate-400">Models are loaded from your Firestore exam configuration.</p></div>{exam.subjects.map((subject) => {
    const core = tasks.filter((task) => task.subjectId === subject.id && task.type !== "revision");
    const complete = core.filter((task) => task.status === "completed").length;
    const percent = core.length ? Math.round(complete / core.length * 100) : 0;
    return <section className="card p-0" key={subject.id}><button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen(open === subject.id ? "" : subject.id)}><div><p className="font-bold">{subject.name}</p><p className="mt-1 text-xs text-slate-400">{percent}% complete · {subject.topics.length} topics</p></div><ChevronDown className={`transition ${open === subject.id ? "rotate-180" : ""}`} /></button><div className="h-1 bg-white/5"><div className="h-full" style={{ width: `${percent}%`, background: subject.color }} /></div>{open === subject.id && <div className="divide-y divide-white/5 px-4">{subject.topics.map((topic) => {
      const coreTasks = tasks.filter((task) => task.topicId === topic.id && task.type !== "revision");
      const done = coreTasks.filter((task) => task.status === "completed").length;
      const doneTopic = coreTasks.length > 0 && done === coreTasks.length;
      return <div className="flex items-center justify-between py-3" key={topic.id}><div><p className="text-sm font-semibold">{topic.name}</p><p className="mt-1 text-xs text-slate-400">{done}/{coreTasks.length} tasks · {topic.estimatedHours}h · {topic.models.map((model) => model.name).join(" · ")}</p></div>{doneTopic ? <CheckCircle2 size={18} className="text-emerald-300" /> : <span className="text-xs font-bold text-slate-500">{coreTasks.length ? `${Math.round(done / coreTasks.length * 100)}%` : "Queued"}</span>}</div>;
    })}</div>}</section>;
  })}</div>;
}
