import type { ExamConfig, ExamDefinition, Priority, StudyModel, Subject, TaskType, Topic } from "@/types/exam-config";

export type { ExamConfig, ExamDefinition, Priority, StudyModel, Subject, TaskType, Topic } from "@/types/exam-config";
export type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";
export type SessionState = "idle" | "studying" | "paused" | "break";

export interface Mission { examId: string; examName: string; examDate: string; targetHours: number; startedAt: string; }
export interface StudyTask { id: string; userId: string; subjectId: string; topicId: string; title: string; type: TaskType; status: TaskStatus; priority: Priority; plannedMinutes: number; dueDate: string; createdAt: string; completedAt?: string; source: "engine" | "manual" | "revision"; }
export interface StudySession { id: string; userId: string; subjectId: string; topicId: string; model?: string; state: SessionState; startedAt: string; endedAt?: string; effectiveSeconds: number; pauseSeconds: number; breakSeconds: number; studySource: string; }
export interface WorkSession { id: string; userId: string; loginAt: string; logoutAt?: string; workload: Priority; notes?: string; }
export interface MockTest { id: string; name: string; score: number; accuracy: number; attempts: number; date: string; timeTakenMinutes: number; subjectScores: Record<string, number>; weakTopics: string[]; strongTopics: string[]; mistakes: string; }
export interface DailyLog { date: string; wakeTarget?: string; wakeActual?: string; sleepHours?: number; sleepQuality?: "poor" | "average" | "good" | "excellent"; distractionMinutes: number; overthinkingMinutes: number; }
export interface DistractionLog { id: string; userId: string; category: "Phone" | "Instagram" | "YouTube" | "Gaming" | "Friends" | "Movies" | "Sleep" | "Overthinking" | "Other"; durationMinutes: number; reason: string; description?: string; createdAt: string; }
export interface CoachReport { summary: string; tomorrowPlan: string[]; weakTopics: string[]; revisionSuggestions: string[]; burnoutRisk: "low" | "medium" | "high"; }
export interface DashboardMetrics { daysRemaining: number; missionProgress: number; completedMinutesToday: number; targetMinutesToday: number; streak: number; risk: "low" | "medium" | "high" | "critical"; pendingTasks: number; dueRevisions: number; }
