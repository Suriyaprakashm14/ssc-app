import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "@/firebase/config";
import type { StudyStateData } from "@/types/study-state";

const collectionName = "study_state";
const documentId = "main";
const pendingLoads = new Map<string, Promise<StudyStateData | null>>();

const referenceFor = (userId: string) => {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured.");
  return doc(db, "users", userId, collectionName, documentId);
};

export const loadStudyState = (userId: string): Promise<StudyStateData | null> => {
  const pending = pendingLoads.get(userId);
  if (pending) return pending;
  const request = getDoc(referenceFor(userId)).then((snapshot) => snapshot.exists() ? (snapshot.data().data as StudyStateData) : null).finally(() => pendingLoads.delete(userId));
  pendingLoads.set(userId, request);
  return request;
};

export const saveStudyState = (userId: string, data: StudyStateData) => setDoc(referenceFor(userId), {
  schemaVersion: 1,
  data,
  updatedAt: serverTimestamp(),
}, { merge: true });
