import type { ExamConfig, ExamDefinition, Mission, StudyTask, Subject, Topic } from "@/types";

const colors = ["#c084fc", "#60a5fa", "#fbbf24", "#fb7185", "#75e6b2"];
const taskTemplates = {
  theory: "Learn {topic}",
  practice: "Practice {topic}",
  pyq: "Solve PYQs: {topic}",
  revision: "Revise {topic}",
  mock: "Take {subject} mock",
};

const slug = (value: string) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const buildSSCExam = (config: ExamConfig): ExamDefinition => ({
  id: "ssc-cgl",
  name: config.examName,
  revisionIntervals: [1, 3, 7, 15, 30],
  taskTemplates,
  subjects: config.syllabus.subjects.map((subject, subjectIndex) => ({
    id: subject.id,
    name: subject.name,
    color: colors[subjectIndex % colors.length],
    topics: subject.topics.map((name) => {
      const id = slug(name);
      const plan = config.studyModels.topics[id];
      const models = plan?.models ?? [];
      return {
        id,
        name,
        weight: subject.id === "quant" || subject.id === "reasoning" ? 5 : 4,
        estimatedHours: plan?.estimatedHours ?? 0,
        models,
      };
    }),
  })),
});

export const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);
export const daysBetween = (from: Date, to: Date) => Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
export const minutesUntil = (to: string, from = new Date()) => Math.max(0, Math.ceil((new Date(to).getTime() - from.getTime()) / 60_000));

export const findTopic = (exam: ExamDefinition, topicId: string): { subject: Subject; topic: Topic } | undefined => {
  for (const subject of exam.subjects) {
    const topic = subject.topics.find((item) => item.id === topicId);
    if (topic) return { subject, topic };
  }
};

export const missionMetrics = (mission: Mission | null, tasks: StudyTask[], minutesToday: number, streak: number) => {
  const open = tasks.filter((task) => task.status !== "completed" && task.status !== "skipped");
  const total = tasks.length || 1;
  const completed = tasks.filter((task) => task.status === "completed").length;
  const daysRemaining = mission ? daysBetween(new Date(), new Date(mission.examDate)) : 0;
  const pendingMinutes = open.reduce((sum, task) => sum + task.plannedMinutes, 0);
  const targetMinutesToday = daysRemaining ? Math.max(45, Math.ceil(pendingMinutes / daysRemaining)) : 0;
  const pressure = daysRemaining ? pendingMinutes / Math.max(daysRemaining * 120, 1) : 0;
  return {
    daysRemaining,
    missionProgress: Math.round((completed / total) * 100),
    completedMinutesToday: minutesToday,
    targetMinutesToday,
    streak,
    pendingTasks: open.length,
    dueRevisions: open.filter((task) => task.type === "revision" && task.dueDate <= dateKey()).length,
    risk: pressure > 2.2 ? "critical" : pressure > 1.5 ? "high" : pressure > 0.8 ? "medium" : "low",
  } as const;
};

export const studyStreak = (sessions: { startedAt: string; effectiveSeconds: number }[]) => {
  const studiedDates = new Set(sessions.filter((session) => session.effectiveSeconds > 0).map((session) => dateKey(new Date(session.startedAt))));
  const cursor = new Date();
  if (!studiedDates.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (studiedDates.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const createRevisionTasks = (task: StudyTask, exam: ExamDefinition): StudyTask[] => exam.revisionIntervals.map((days) => ({
  ...task,
  id: `${task.id}-r${days}`,
  title: `Revise: ${task.title.replace(/^(Learn|Practice) /, "")}`,
  type: "revision",
  status: "pending",
  priority: days <= 3 ? "high" : "medium",
  dueDate: dateKey(new Date(Date.now() + days * 86_400_000)),
  createdAt: new Date().toISOString(),
  source: "revision",
}));

export const estimateExamHours = (exam: ExamDefinition) => exam.subjects.reduce((total, subject) => total + subject.topics.reduce((sum, topic) => sum + topic.estimatedHours, 0), 0);

export const seedTasks = (exam: ExamDefinition, userId = "local"): StudyTask[] => {
  const rotatedTopics = Array.from({ length: Math.max(...exam.subjects.map((subject) => subject.topics.length), 0) }).flatMap((_, topicIndex) =>
    exam.subjects.flatMap((subject) => {
      const topic = subject.topics[topicIndex];
      return topic ? [{ subject, topic, topicIndex }] : [];
    }),
  );

  return rotatedTopics.flatMap(({ subject, topic, topicIndex }, rotationIndex) => (["theory", "practice", "pyq"] as const).map((type, typeIndex) => ({
    id: `${subject.id}-${topic.id}-${type}`,
    userId,
    subjectId: subject.id,
    topicId: topic.id,
    title: exam.taskTemplates[type].replace("{topic}", topic.name).replace("{subject}", subject.name),
    type,
    status: "pending",
    priority: topicIndex < 2 ? "high" : topic.models.some((model) => model.priority === "critical") ? "high" : "medium",
    plannedMinutes: type === "theory" ? 60 : 45,
    dueDate: dateKey(new Date(Date.now() + (rotationIndex * 2 + typeIndex) * 86_400_000)),
    createdAt: new Date().toISOString(),
    source: "engine",
  })));
};

export const mergeSeedTasks = (current: StudyTask[], exam: ExamDefinition, userId = "local") => {
  const existingIds = new Set(current.map((task) => task.id));
  const additions = seedTasks(exam, userId).filter((task) => !existingIds.has(task.id));
  return additions.length ? [...current, ...additions] : current;
};
