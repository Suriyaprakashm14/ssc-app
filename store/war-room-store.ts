"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createRevisionTasks, dateKey, seedTasks } from "@/lib/exam-engine";
import { createId } from "@/lib/id";
import type { DailyLog, DistractionLog, ExamDefinition, Mission, MockTest, SessionState, StudySession, StudyTask, TaskStatus, WorkSession } from "@/types";
import type { StudyStateData, TimerState } from "@/types/study-state";

type Timer = TimerState;
type State = {
  mission: Mission | null;
  tasks: StudyTask[];
  sessions: StudySession[];
  workSessions: WorkSession[];
  mocks: MockTest[];
  distractions: DistractionLog[];
  daily: DailyLog;
  timer: Timer;
  exam?: ExamDefinition;
  ownerId?: string;
  cloudReady: boolean;
  prepareCloudUser: (userId: string) => void;
  hydrateFromCloud: (data: StudyStateData, userId: string) => void;
  toStudyStateData: () => StudyStateData;
  configureExam: (exam: ExamDefinition) => void;
  setMission: (mission: Mission) => void;
  updateTask: (id: string, status: TaskStatus) => void;
  startTimer: (task: StudyTask) => boolean;
  setTimerState: (state: SessionState) => void;
  endTask: () => boolean;
  addMock: (mock: MockTest) => void;
  addDistraction: (log: Omit<DistractionLog, "id" | "userId" | "createdAt">) => void;
  updateDaily: (daily: Partial<DailyLog>) => void;
  startWork: (workload: WorkSession["workload"], notes?: string) => void;
  endWork: () => boolean;
};

const idleTimer = (): Timer => ({ state: "idle", effectiveSeconds: 0, pauseSeconds: 0, breakSeconds: 0 });
const emptyStudyState = (): StudyStateData => ({ mission: null, tasks: [], sessions: [], workSessions: [], mocks: [], distractions: [], daily: { date: dateKey(), distractionMinutes: 0, overthinkingMinutes: 0 }, timer: idleTimer() });
const normalizeUserData = (data: StudyStateData, userId: string): StudyStateData => ({ ...data, tasks: data.tasks.map((task) => ({ ...task, userId })), sessions: data.sessions.map((session) => ({ ...session, userId })), distractions: data.distractions.map((distraction) => ({ ...distraction, userId })) });
const settleTimer = (timer: Timer, now = Date.now()): Timer => {
  const elapsed = timer.lastChangedAt ? Math.max(0, Math.floor((now - timer.lastChangedAt) / 1000)) : 0;
  const effectiveSeconds = timer.effectiveSeconds ?? 0;
  const pauseSeconds = timer.pauseSeconds ?? 0;
  const breakSeconds = timer.breakSeconds ?? 0;
  if (!elapsed) return { ...timer, effectiveSeconds, pauseSeconds, breakSeconds };
  return { ...timer, effectiveSeconds: effectiveSeconds + (timer.state === "studying" ? elapsed : 0), pauseSeconds: pauseSeconds + (timer.state === "paused" ? elapsed : 0), breakSeconds: breakSeconds + (timer.state === "break" ? elapsed : 0), lastChangedAt: now };
};

export const useWarRoomStore = create<State>()(persist((set, get) => ({
  ...emptyStudyState(),
  cloudReady: false,
  prepareCloudUser: (userId) => set((state) => {
    const data = state.ownerId && state.ownerId !== userId ? emptyStudyState() : normalizeUserData(state.toStudyStateData(), userId);
    return { ...data, ownerId: userId, cloudReady: true };
  }),
  hydrateFromCloud: (data, userId) => set({ ...normalizeUserData(data, userId), ownerId: userId, cloudReady: true }),
  toStudyStateData: () => {
    const state = get();
    return { mission: state.mission, tasks: state.tasks, sessions: state.sessions, workSessions: state.workSessions, mocks: state.mocks, distractions: state.distractions, daily: state.daily, timer: state.timer };
  },
  configureExam: (exam) => set((state) => ({
    exam,
    mission: state.mission ?? { examId: exam.id, examName: exam.name, examDate: "2026-09-15", targetHours: 800, startedAt: new Date().toISOString() },
    tasks: state.tasks.length ? state.tasks : seedTasks(exam, state.ownerId ?? "local"),
  })),
  setMission: (mission) => set((state) => ({ mission, tasks: state.exam ? seedTasks(state.exam) : state.tasks, timer: idleTimer() })),
  updateTask: (id, status) => set((state) => {
    const task = state.tasks.find((item) => item.id === id);
    const tasks = state.tasks.map((item) => item.id === id ? { ...item, status, completedAt: status === "completed" ? new Date().toISOString() : undefined } : item);
    if (status !== "completed" || !task || task.type === "revision" || !state.exam) return { tasks };
    return { tasks: [...tasks, ...createRevisionTasks({ ...task, status }, state.exam)] };
  }),
  startTimer: (task) => {
    const state = get();
    const hasActiveWork = state.workSessions.some((work) => !work.logoutAt);
    if (!hasActiveWork || state.timer.state !== "idle") return false;
    const now = Date.now();
    set({ timer: { state: "studying", startedAt: now, lastChangedAt: now, taskId: task.id, effectiveSeconds: 0, pauseSeconds: 0, breakSeconds: 0 }, tasks: state.tasks.map((item) => item.id === task.id ? { ...item, status: "in_progress" } : item.status === "in_progress" ? { ...item, status: "pending" } : item) });
    return true;
  },
  setTimerState: (nextState) => set((current) => {
    if (current.timer.state === "idle" || current.timer.state === nextState) return {};
    const timer = settleTimer(current.timer);
    return { timer: { ...timer, state: nextState, lastChangedAt: Date.now() } };
  }),
  endTask: () => {
    const state = get();
    if (state.timer.state === "idle") return false;
    set((current) => {
      const timer = settleTimer(current.timer);
      const task = current.tasks.find((item) => item.id === timer.taskId);
      if (!task) return { timer: idleTimer() };
      return { timer: idleTimer(), sessions: [{ id: createId(), userId: current.ownerId ?? "local", subjectId: task.subjectId, topicId: task.topicId, state: "idle", startedAt: new Date(timer.startedAt ?? Date.now()).toISOString(), endedAt: new Date().toISOString(), effectiveSeconds: timer.effectiveSeconds, pauseSeconds: timer.pauseSeconds, breakSeconds: timer.breakSeconds, studySource: "War Room task timer" }, ...current.sessions] };
    });
    return true;
  },
  addMock: (mock) => set((state) => ({ mocks: [mock, ...state.mocks] })),
  addDistraction: (log) => set((state) => ({ distractions: [{ ...log, id: createId(), userId: state.ownerId ?? "local", createdAt: new Date().toISOString() }, ...state.distractions], daily: { ...state.daily, distractionMinutes: state.daily.distractionMinutes + log.durationMinutes } })),
  updateDaily: (daily) => set((state) => ({ daily: { ...state.daily, ...daily } })),
  startWork: (workload, notes) => set((state) => state.workSessions.some((work) => !work.logoutAt) ? {} : ({ workSessions: [{ id: createId(), userId: "local", loginAt: new Date().toISOString(), workload, notes }, ...state.workSessions] })),
  endWork: () => {
    const state = get();
    const activeWork = state.workSessions.find((work) => !work.logoutAt);
    if (!activeWork || state.timer.state !== "idle") return false;
    set((current) => ({ workSessions: current.workSessions.map((work) => work.id === activeWork.id ? { ...work, logoutAt: new Date().toISOString() } : work) }));
    return true;
  },
}), { name: "ssc-war-room", version: 5, partialize: (state) => ({ ...state.toStudyStateData(), ownerId: state.ownerId }) }));
