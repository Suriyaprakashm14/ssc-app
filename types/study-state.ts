import type { DailyLog, DistractionLog, Mission, MockTest, SessionState, StudySession, StudyTask, WorkSession } from "@/types";

export interface TimerState {
  state: SessionState;
  startedAt?: number;
  lastChangedAt?: number;
  taskId?: string;
  effectiveSeconds: number;
  pauseSeconds: number;
  breakSeconds: number;
}

export interface StudyStateData {
  mission: Mission | null;
  tasks: StudyTask[];
  sessions: StudySession[];
  workSessions: WorkSession[];
  mocks: MockTest[];
  distractions: DistractionLog[];
  daily: DailyLog;
  timer: TimerState;
}
