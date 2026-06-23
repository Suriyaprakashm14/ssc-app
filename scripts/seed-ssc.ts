import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebase/admin";
import type { SscSyllabus, StudyModels } from "../types/exam-config";

const readJson = async <T>(filename: string): Promise<T> => JSON.parse(await readFile(resolve(process.cwd(), "data", filename), "utf8")) as T;

async function seed() {
  const [syllabus, studyModels] = await Promise.all([
    readJson<SscSyllabus>("ssc-cgl-syllabus.json"),
    readJson<StudyModels>("study-models.json"),
  ]);

  await getAdminDb().collection("exam_configs").doc("ssc_cgl").set({
    examName: syllabus.examName,
    version: syllabus.version,
    syllabus,
    studyModels,
    seededAt: FieldValue.serverTimestamp(),
  });

  console.log("SSC syllabus seeded successfully");
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
