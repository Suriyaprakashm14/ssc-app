"use client";

import { Check, ChevronDown, Clock, Play } from "lucide-react";
import { useState } from "react";
import { useWarRoomStore } from "@/store/war-room-store";
import type { ExamDefinition, StudyTask } from "@/types";

export function TaskList({ exam, goToStudy }: { exam: ExamDefinition; goToStudy: () => void }) {
  const { tasks, updateTask, startTimer } = useWarRoomStore();
  const [openSubject, setOpenSubject] = useState<string | undefined>(exam.subjects[0]?.id);
  const [openTopic, setOpenTopic] = useState<string>();
  const start = (task: StudyTask) => {
    if (startTimer(task)) updateTask(task.id, "in_progress");
    goToStudy();
  };

  return <div className="space-y-4"><div><p className="label">Auto-generated study plan</p><h1 className="text-2xl font-black">Task command board</h1><p className="mt-1 text-sm text-slate-400">Open a subject, choose a topic, then start its theory, practice, PYQ, or revision task.</p></div>{exam.subjects.map((subject) => {
    const subjectTasks = tasks.filter((task) => task.subjectId === subject.id);
    const completed = subjectTasks.filter((task) => task.status === "completed").length;
    const progress = subjectTasks.length ? Math.round(completed / subjectTasks.length * 100) : 0;
    return <section key={subject.id} className="card p-0"><button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpenSubject(openSubject === subject.id ? undefined : subject.id)}><div className="flex items-center gap-3"><span className="h-9 w-1 rounded-full" style={{ background: subject.color }} /><div><p className="text-base font-black">{subject.name}</p><p className="mt-1 text-xs text-slate-400">{subject.topics.length} topics · {completed}/{subjectTasks.length} tasks complete</p></div></div><ChevronDown className={`transition ${openSubject === subject.id ? "rotate-180" : ""}`} /></button><div className="h-1 bg-white/5"><div className="h-full" style={{ width: `${progress}%`, background: subject.color }} /></div>{openSubject === subject.id && <div className="divide-y divide-white/5">{subject.topics.map((topic) => {
      const topicTasks = tasks.filter((task) => task.topicId === topic.id);
      const done = topicTasks.filter((task) => task.status === "completed").length;
      const isOpen = openTopic === topic.id;
      return <div key={topic.id}><button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpenTopic(isOpen ? undefined : topic.id)}><div><p className="font-semibold">{topic.name}</p><p className="mt-1 text-xs text-slate-400">{done}/{topicTasks.length} tasks · {topic.estimatedHours} hours · {topic.models.map((model) => model.name).join(" · ")}</p></div><ChevronDown size={17} className={`text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} /></button>{isOpen && <div className="space-y-2 bg-black/10 px-3 pb-3">{topicTasks.length ? topicTasks.map((task) => <TaskRow key={task.id} task={task} start={start} complete={() => updateTask(task.id, "completed")} />) : <p className="p-2 text-sm text-slate-400">The engine will queue this topic after current priorities.</p>}</div>}</div>;
    })}</div>}</section>;
  })}</div>;
}

function TaskRow({ task, start, complete }: { task: StudyTask; start: (task: StudyTask) => void; complete: () => void }) {
  const done = task.status === "completed";
  return <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3"><div className="flex items-start justify-between gap-2"><div><p className={`text-sm font-semibold ${done ? "text-slate-500 line-through" : ""}`}>{task.title}</p><p className="mt-1 text-xs text-slate-400"><Clock className="mr-1 inline" size={12} />{task.plannedMinutes}m · {task.type} · due {task.dueDate}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${task.priority === "high" || task.priority === "critical" ? "bg-amber-300/10 text-amber-300" : "bg-white/5 text-slate-400"}`}>{task.priority}</span></div>{!done && <div className="mt-3 flex gap-2"><button className="btn-quiet !px-3 !py-2" onClick={() => start(task)}><Play size={14} />Start</button><button className="btn-primary !px-3 !py-2" onClick={complete}><Check size={14} />Complete</button></div>}</div>;
}
