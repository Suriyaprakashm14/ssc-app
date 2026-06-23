import type { CoachReport, StudyTask } from "@/types";

export async function generateCoachReport(input: { tasks: StudyTask[]; studyMinutesWeek: number; distractionMinutesWeek: number; missionDaysRemaining: number }): Promise<CoachReport> {
  const payload = { completedTasks: input.tasks.filter((task) => task.status === "completed").length, pendingTasks: input.tasks.filter((task) => task.status !== "completed").map(({ subjectId, topicId, type, priority, dueDate }) => ({ subjectId, topicId, type, priority, dueDate })), studyMinutesWeek: input.studyMinutesWeek, distractionMinutesWeek: input.distractionMinutesWeek, missionDaysRemaining: input.missionDaysRemaining };
  const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("The AI coach could not prepare a report.");
  return response.json() as Promise<CoachReport>;
}
