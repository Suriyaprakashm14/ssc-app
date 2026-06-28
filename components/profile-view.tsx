"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, CalendarDays, LogOut, Moon, Save, Sunrise } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DistractionEntry } from "@/components/distraction-entry";
import { useAuth } from "@/components/auth-gate";
import { daysBetween, estimateExamHours } from "@/lib/exam-engine";
import { useWarRoomStore } from "@/store/war-room-store";
import type { ExamDefinition } from "@/types";

const missionSchema = z.object({ examId: z.string().min(1), examDate: z.string().date(), targetHours: z.coerce.number().min(0.5).max(24) });
type MissionForm = z.infer<typeof missionSchema>;

const roundHours = (value: number) => Math.max(0.5, Math.ceil(value * 2) / 2);

export function ProfileView({ exam }: { exam: ExamDefinition }) {
  const { mission, setMission, daily, updateDaily, workSessions, startWork, endWork, timer, tasks } = useWarRoomStore();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const form = useForm<MissionForm>({
    resolver: zodResolver(missionSchema),
    defaultValues: { examId: mission?.examId ?? exam.id, examDate: mission?.examDate ?? "2026-09-15", targetHours: mission?.targetHours ?? 6 },
  });
  const examDate = form.watch("examDate");
  const pendingHours = useMemo(() => {
    const pendingMinutes = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped").reduce((total, task) => total + task.plannedMinutes, 0);
    return pendingMinutes > 0 ? pendingMinutes / 60 : estimateExamHours(exam);
  }, [exam, tasks]);
  const daysLeft = daysBetween(new Date(), new Date(examDate));
  const requiredDailyHours = roundHours(daysLeft ? pendingHours / daysLeft : pendingHours);
  const activeWork = workSessions.find((work) => !work.logoutAt);

  useEffect(() => {
    form.setValue("targetHours", requiredDailyHours, { shouldDirty: true, shouldValidate: true });
  }, [form, requiredDailyHours]);

  const save = (values: MissionForm) => setMission({ ...values, targetHours: requiredDailyHours, examName: exam.name, startedAt: mission?.startedAt ?? new Date().toISOString() });
  const logout = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return <div className="space-y-4">
    <div>
      <p className="label">Mission control & logbook</p>
      <h1 className="text-2xl font-black">Profile & trackers</h1>
    </div>

    <section className="card">
      <p className="font-bold">Mission setup</p>
      <form className="mt-3 space-y-3" onSubmit={form.handleSubmit(save)}>
        <label className="label block">Exam
          <select className="input" {...form.register("examId")}><option className="bg-slate-900" value={exam.id}>{exam.name}</option></select>
        </label>
        <label className="label block">Exam date
          <input className="input" type="date" {...form.register("examDate")} />
        </label>
        <label className="label block">Required study hours/day
          <input className="input" readOnly type="number" step="0.5" {...form.register("targetHours")} />
        </label>
        <div className="rounded-xl bg-white/5 p-3 text-xs text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-emerald-200"><CalendarDays size={14} />{daysLeft} days left</div>
          <p className="mt-1">Pending workload is about {Math.ceil(pendingHours)} hours. The app recalculates the daily target from your exam date.</p>
        </div>
        <button className="btn-primary w-full" type="submit"><Save size={16} />Save mission</button>
      </form>
    </section>

    <section className="card">
      <div className="flex items-center gap-2"><Sunrise className="text-amber-300" size={18} /><p className="font-bold">Wakeup & sleep</p></div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="label">Actual wakeup<input className="input" type="time" value={daily.wakeActual ?? ""} onChange={(event) => updateDaily({ wakeActual: event.target.value })} /></label>
        <label className="label"><span className="inline-flex items-center gap-1"><Moon size={12} />Sleep hours</span><input className="input" type="number" min="0" max="16" step=".5" value={daily.sleepHours ?? ""} onChange={(event) => updateDaily({ sleepHours: Number(event.target.value) })} /></label>
      </div>
    </section>

    <DistractionEntry />

    <section className="card">
      <div className="flex items-center gap-2"><BriefcaseBusiness className="text-sky-300" size={18} /><p className="font-bold">Work session</p></div>
      <p className="mt-1 text-sm text-slate-400">{activeWork ? "Logged in. You can manage the task timer from Study." : "No active work session."}</p>
      {activeWork
        ? <button className="btn-primary mt-3 w-full" disabled={timer.state !== "idle"} onClick={endWork}>{timer.state === "idle" ? "Logout" : "End task timer before logout"}</button>
        : <button className="btn-primary mt-3 w-full" onClick={() => startWork("medium")}>Login</button>}
    </section>

    <section className="card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-bold">Firebase account</p>
          <p className="mt-1 text-sm text-slate-400">{user?.displayName || user?.email || "Signed in"}</p>
          <p className="mt-1 text-xs text-slate-500">Persistent Firebase session enabled on this device.</p>
        </div>
        <button className="btn-quiet !px-3 !py-2" disabled={signingOut} onClick={() => void logout()}><LogOut size={16} />{signingOut ? "Signing out..." : "Sign out"}</button>
      </div>
    </section>
  </div>;
}
