import { doc, getDoc } from "firebase/firestore";
import studyModels from "@/data/study-models.json";
import syllabus from "@/data/ssc-cgl-syllabus.json";
import { getDb } from "@/firebase/config";
import type { ExamConfig, SscSyllabus, StudyModels } from "@/types/exam-config";

const collectionName = "exam_configs";
const documentId = "ssc_cgl";
let cachedConfig: ExamConfig | undefined;
let pendingRequest: Promise<ExamConfig> | undefined;

const missingConfigError = "Syllabus not seeded. Run npm run seed:ssc";
const localConfig: ExamConfig = {
  examName: syllabus.examName,
  version: syllabus.version,
  syllabus: syllabus as SscSyllabus,
  studyModels: studyModels as StudyModels,
};

const isExamConfig = (value: unknown): value is ExamConfig => {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<ExamConfig>;
  return typeof config.examName === "string"
    && typeof config.version === "string"
    && Array.isArray(config.syllabus?.subjects)
    && Boolean(config.studyModels?.topics);
};

export const getSSCConfig = (): Promise<ExamConfig> => {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (pendingRequest) return pendingRequest;

  const db = getDb();
  if (!db) return Promise.resolve(localConfig);

  pendingRequest = getDoc(doc(db, collectionName, documentId))
    .then((snapshot) => {
      if (!snapshot.exists()) return localConfig;
      const data = snapshot.data();
      if (!isExamConfig(data)) return localConfig;
      cachedConfig = data.syllabus.subjects.length >= localConfig.syllabus.subjects.length ? data : localConfig;
      return cachedConfig;
    })
    .catch((error) => {
      if (error instanceof Error && error.message === missingConfigError) throw error;
      return localConfig;
    })
    .finally(() => {
      pendingRequest = undefined;
    });

  return pendingRequest;
};

export const clearSSCConfigCache = () => {
  cachedConfig = undefined;
};
