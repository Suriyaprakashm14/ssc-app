import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ completedTasks: z.number(), pendingTasks: z.array(z.object({ subjectId: z.string(), topicId: z.string(), type: z.string(), priority: z.string(), dueDate: z.string() })), studyMinutesWeek: z.number(), distractionMinutesWeek: z.number(), missionDaysRemaining: z.number() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid coach input" }, { status: 400 });
  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json({ summary: "Coach setup needed: add OPENROUTER_API_KEY to enable personalised planning.", tomorrowPlan: parsed.data.pendingTasks.slice(0, 3).map((task) => `${task.type}: ${task.topicId}`), weakTopics: [], revisionSuggestions: parsed.data.pendingTasks.filter((task) => task.type === "revision").slice(0, 2).map((task) => task.topicId), burnoutRisk: parsed.data.distractionMinutesWeek > 600 ? "high" : "low" });
  const prompt = `You are an SSC CGL study coach. Respond with valid JSON only matching {summary:string,tomorrowPlan:string[],weakTopics:string[],revisionSuggestions:string[],burnoutRisk:"low"|"medium"|"high"}. Use this aggregate data: ${JSON.stringify(parsed.data)}`;
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }) });
  if (!upstream.ok) return NextResponse.json({ error: "AI coach is unavailable" }, { status: 502 });
  const result = await upstream.json();
  try { return NextResponse.json(JSON.parse(result.choices[0].message.content)); } catch { return NextResponse.json({ error: "AI coach returned an invalid response" }, { status: 502 }); }
}
