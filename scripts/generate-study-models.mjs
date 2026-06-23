import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const syllabus = JSON.parse(await readFile(resolve(root, "data/ssc-cgl-syllabus.json"), "utf8"));
const plans = {
  reasoning: [1, 1.5, 1.5, 1.25, 0.75],
  quant: [1.75, 2, 2, 1.75, 1],
  english: [1.25, 1.5, 1.5, 1.25, 0.75],
  general_awareness: [0.75, 1, 1, 1, 0.75],
  computer: [0.75, 1, 1, 0.75, 0.5]
};
const labels = [
  ["beginner", "Beginner Models", "beginner", "high"],
  ["intermediate", "Intermediate Models", "intermediate", "high"],
  ["advanced", "Advanced Models", "advanced", "medium"],
  ["pyq", "PYQ Practice", "intermediate", "critical"],
  ["sectional-mock", "Sectional Mock", "advanced", "high"]
];
const slug = (value) => value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const topics = Object.fromEntries(syllabus.subjects.flatMap((subject) => subject.topics.map((topic) => {
  const hours = plans[subject.id] ?? plans.reasoning;
  const id = slug(topic);
  return [id, { id, topic, subjectId: subject.id, estimatedHours: hours.reduce((sum, value) => sum + value, 0), models: labels.map(([idSuffix, name, difficulty, priority], index) => ({ id: `${id}-${idSuffix}`, name, estimatedHours: hours[index], difficulty, priority })) }];
})));
const totalHours = Object.values(topics).reduce((sum, topic) => sum + topic.estimatedHours, 0);
const output = { examId: "ssc-cgl", studyPlan: { targetDailyHours: "5-6", planningHorizonDays: 180, totalEstimatedHours: totalHours }, topics };
await writeFile(resolve(root, "data/study-models.json"), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated ${Object.keys(topics).length} topic model plans (${totalHours} hours).`);
