"use client";

import { Check, CheckCircle2, ChevronDown, Clock, LockKeyhole, Play } from "lucide-react";
import { useMemo, useState } from "react";
import { useWarRoomStore } from "@/store/war-room-store";
import type { ExamDefinition, StudyTask } from "@/types";

export function TaskList({ exam, goToStudy }: { exam: ExamDefinition; goToStudy: () => void }) {
  const { tasks, sessions, updateTask, startTimer, workSessions } = useWarRoomStore();
  const [openSubject, setOpenSubject] = useState<string | undefined>(exam.subjects[0]?.id);
  const [openTopic, setOpenTopic] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const activeWork = workSessions.some((work) => !work.logoutAt);
  const completedTopicIds = new Set(tasks.filter((task) => task.status === "completed").map((task) => task.topicId));
  const mixedPlan = useMemo(() => exam.subjects
    .map((subject) => tasks.find((task) => task.subjectId === subject.id && task.status !== "completed" && task.status !== "skipped"))
    .filter((task): task is StudyTask => Boolean(task))
    .slice(0, 5), [exam.subjects, tasks]);

  const start = (task: StudyTask) => {
    if (!startTimer(task)) {
      setNotice("Login first, then start the task timer.");
      return;
    }
    setNotice(undefined);
    goToStudy();
  };

  const complete = (task: StudyTask) => {
    if (updateTask(task.id, "completed")) {
      setNotice(undefined);
      return;
    }
    setNotice("To complete a task, stay logged in and record at least 5 minutes on that exact task timer.");
  };

  return <div className="space-y-4">
    <div>
      <p className="label">Auto-generated study plan</p>
      <h1 className="text-2xl font-black">Task command board</h1>
      <p className="mt-1 text-sm text-slate-400">Each topic stays visible after completion. New plans are mixed across subjects.</p>
    </div>

    {notice && <section className="card border-amber-300/20 text-sm font-semibold text-amber-200">{notice}</section>}

    {mixedPlan.length > 0 && <section className="card">
      <p className="label">Today mixed queue</p>
      <div className="mt-3 space-y-2">
        {mixedPlan.map((task) => <button key={task.id} className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left" onClick={() => start(task)}>
          <span className="text-sm font-semibold">{subjectName(exam, task.subjectId)}: {task.title}</span>
          <Play size={14} className="text-emerald-300" />
        </button>)}
      </div>
    </section>}

    {exam.subjects.map((subject) => {
      const subjectTasks = tasks.filter((task) => task.subjectId === subject.id);
      const completed = subjectTasks.filter((task) => task.status === "completed").length;
      const progress = subjectTasks.length ? Math.round(completed / subjectTasks.length * 100) : 0;

      return <section key={subject.id} className="card p-0">
        <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpenSubject(openSubject === subject.id ? undefined : subject.id)}>
          <div className="flex items-center gap-3">
            <span className="h-9 w-1 rounded-full" style={{ background: subject.color }} />
            <div>
              <p className="text-base font-black">{subject.name}</p>
              <p className="mt-1 text-xs text-slate-400">{subject.topics.length} topics · {completed}/{subjectTasks.length} tasks complete</p>
            </div>
          </div>
          <ChevronDown className={`transition ${openSubject === subject.id ? "rotate-180" : ""}`} />
        </button>
        <div className="h-1 bg-white/5"><div className="h-full" style={{ width: `${progress}%`, background: subject.color }} /></div>

        {openSubject === subject.id && <div className="divide-y divide-white/5">
          {subject.topics.map((topic) => {
            const topicTasks = tasks.filter((task) => task.topicId === topic.id);
            const done = topicTasks.filter((task) => task.status === "completed").length;
            const isOpen = openTopic === topic.id;
            const topicComplete = topicTasks.length > 0 && done === topicTasks.length;

            return <div key={topic.id}>
              <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setOpenTopic(isOpen ? undefined : topic.id)}>
                <div>
                  <p className="font-semibold">{topic.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{done}/{topicTasks.length} tasks · {topic.estimatedHours} hours · {topic.models.map((model) => model.name).join(" · ")}</p>
                </div>
                {topicComplete ? <CheckCircle2 size={17} className="text-emerald-300" /> : <ChevronDown size={17} className={`text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />}
              </button>
              {isOpen && <div className="space-y-2 bg-black/10 px-3 pb-3">
                {topicTasks.length
                  ? topicTasks.map((task) => <TaskRow key={task.id} activeWork={activeWork} complete={() => complete(task)} sessions={sessions} start={start} task={task} />)
                  : <p className="p-2 text-sm text-slate-400">{completedTopicIds.has(topic.id) ? "Topic completed." : "No task found for this topic yet."}</p>}
              </div>}
            </div>;
          })}
        </div>}
      </section>;
    })}
  </div>;
}

function subjectName(exam: ExamDefinition, subjectId: string) {
  return exam.subjects.find((subject) => subject.id === subjectId)?.name.replace("General Intelligence & Reasoning", "Reasoning").replace("Quantitative Aptitude", "Quant").replace("English Language & Comprehension", "English").replace("General Awareness", "GA") ?? subjectId;
}

function TaskRow({ task, start, complete, activeWork, sessions }: { task: StudyTask; start: (task: StudyTask) => void; complete: () => void; activeWork: boolean; sessions: { taskId?: string; effectiveSeconds: number }[] }) {
  const done = task.status === "completed";
  const studiedSeconds = sessions.filter((session) => session.taskId === task.id).reduce((total, session) => total + session.effectiveSeconds, 0);
  const canComplete = activeWork && studiedSeconds >= 300;

  return <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className={`text-sm font-semibold ${done ? "text-slate-500 line-through" : ""}`}>{task.title}</p>
        <p className="mt-1 text-xs text-slate-400"><Clock className="mr-1 inline" size={12} />{task.plannedMinutes}m · {task.type} · due {task.dueDate} · tracked {Math.floor(studiedSeconds / 60)}m</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${task.priority === "high" || task.priority === "critical" ? "bg-amber-300/10 text-amber-300" : "bg-white/5 text-slate-400"}`}>{task.priority}</span>
    </div>
    {!done && <div className="mt-3 flex flex-wrap gap-2">
      <button className="btn-quiet !px-3 !py-2" onClick={() => start(task)}><Play size={14} />Start</button>
      <button className="btn-primary !px-3 !py-2" onClick={complete}>{canComplete ? <Check size={14} /> : <LockKeyhole size={14} />}Complete</button>
    </div>}
  </div>;
}
