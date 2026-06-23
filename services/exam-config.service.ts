import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/firebase/config";
import type { ExamConfig } from "@/types/exam-config";

const collectionName = "exam_configs";
const documentId = "ssc_cgl";
let cachedConfig: ExamConfig | undefined;
let pendingRequest: Promise<ExamConfig> | undefined;

const missingConfigError = "Syllabus not seeded. Run npm run seed:ssc";

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
  if (!db) return Promise.reject(new Error("Firebase is not configured."));

  pendingRequest = getDoc(doc(db, collectionName, documentId))
    .then((snapshot) => {
      if (!snapshot.exists()) throw new Error(missingConfigError);
      const data = snapshot.data();
      if (!isExamConfig(data)) throw new Error("The SSC syllabus configuration is invalid.");
      cachedConfig = data;
      return cachedConfig;
    })
    .finally(() => {
      pendingRequest = undefined;
    });

  return pendingRequest;
};

export const clearSSCConfigCache = () => {
  cachedConfig = undefined;
};
