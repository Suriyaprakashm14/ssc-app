import type { Timestamp } from "firebase/firestore";

export type Priority = "low" | "medium" | "high" | "critical";
export type TaskType = "theory" | "practice" | "pyq" | "revision" | "mock";

export interface StudyModel {
  id: string;
  name: string;
  estimatedHours: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  priority: Priority;
}

export interface StudyModelPlan {
  estimatedHours: number;
  models: StudyModel[];
}

export interface StudyModels {
  topics: Record<string, StudyModelPlan>;
}

export interface SyllabusSubject {
  id: string;
  name: string;
  topics: string[];
}

export interface SscSyllabus {
  examName: string;
  version: string;
  subjects: SyllabusSubject[];
}

export interface Topic {
  id: string;
  name: string;
  weight: number;
  estimatedHours: number;
  models: StudyModel[];
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  topics: Topic[];
}

export type TaskTemplate = Record<TaskType, string>;

export interface ExamDefinition {
  id: string;
  name: string;
  subjects: Subject[];
  taskTemplates: TaskTemplate;
  revisionIntervals: number[];
}

export interface ExamConfig {
  examName: string;
  version: string;
  syllabus: SscSyllabus;
  studyModels: StudyModels;
  seededAt?: Timestamp;
}
