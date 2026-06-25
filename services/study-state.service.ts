import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/firebase/config";
import type { StudyStateData } from "@/types/study-state";

const collectionName = "study_state";
const documentId = "main";
const pendingLoads = new Map<string, Promise<StudyStateData | null>>();
const todayKey = () => new Date().toISOString().slice(0, 10);

const defaultStudyState = (): StudyStateData => ({
  mission: null,
  tasks: [],
  sessions: [],
  workSessions: [],
  mocks: [],
  distractions: [],
  daily: { date: todayKey(), distractionMinutes: 0, overthinkingMinutes: 0 },
  timer: { state: "idle", effectiveSeconds: 0, pauseSeconds: 0, breakSeconds: 0 },
});

const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)]),
  ) as T;
};

const normalizeLoadedState = (raw: unknown): StudyStateData | null => {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { data?: unknown };
  const source = record.data && typeof record.data === "object" ? record.data : raw;
  const data = source as Partial<StudyStateData>;
  const fallback = defaultStudyState();

  return {
    mission: data.mission ?? fallback.mission,
    tasks: Array.isArray(data.tasks) ? data.tasks : fallback.tasks,
    sessions: Array.isArray(data.sessions) ? data.sessions : fallback.sessions,
    workSessions: Array.isArray(data.workSessions) ? data.workSessions : fallback.workSessions,
    mocks: Array.isArray(data.mocks) ? data.mocks : fallback.mocks,
    distractions: Array.isArray(data.distractions) ? data.distractions : fallback.distractions,
    daily: data.daily ?? fallback.daily,
    timer: data.timer ?? fallback.timer,
  };
};

const referenceFor = (userId: string) => {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured.");
  return doc(db, "users", userId, collectionName, documentId);
};

export const loadStudyState = (userId: string): Promise<StudyStateData | null> => {
  const pending = pendingLoads.get(userId);
  if (pending) return pending;
  const request = getDoc(referenceFor(userId)).then((snapshot) => snapshot.exists() ? normalizeLoadedState(snapshot.data()) : null).finally(() => pendingLoads.delete(userId));
  pendingLoads.set(userId, request);
  return request;
};

export const saveStudyState = (userId: string, data: StudyStateData) => {
  const cleanData = stripUndefined(data);
  return setDoc(referenceFor(userId), {
    schemaVersion: 2,
    ...cleanData,
    data: cleanData,
    summary: {
      totalTasks: cleanData.tasks.length,
      completedTasks: cleanData.tasks.filter((task) => task.status === "completed").length,
      pendingTasks: cleanData.tasks.filter((task) => task.status === "pending").length,
      inProgressTasks: cleanData.tasks.filter((task) => task.status === "in_progress").length,
      skippedTasks: cleanData.tasks.filter((task) => task.status === "skipped").length,
      totalEffectiveSeconds: cleanData.sessions.reduce((total, session) => total + session.effectiveSeconds, 0),
      activeTimerState: cleanData.timer.state,
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
};
