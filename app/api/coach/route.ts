import { NextResponse } from "next/server";
import { z } from "zod";

const inputSchema = z.object({
  completedTasks: z.number(),
  pendingTasks: z.array(z.object({
    subjectId: z.string(),
    topicId: z.string(),
    type: z.string(),
    priority: z.string(),
    dueDate: z.string(),
  })),
  studyMinutesWeek: z.number(),
  distractionMinutesWeek: z.number(),
  missionDaysRemaining: z.number(),
});

const reportSchema = z.object({
  summary: z.string(),
  tomorrowPlan: z.array(z.string()),
  weakTopics: z.array(z.string()),
  revisionSuggestions: z.array(z.string()),
  burnoutRisk: z.enum(["low", "medium", "high"]),
});

type CoachInput = z.infer<typeof inputSchema>;

const fallbackReport = (data: CoachInput, reason?: string) => {
  const urgent = [...data.pendingTasks]
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  return {
    summary: reason
      ? `OpenRouter did not return a usable report (${reason}). Showing a rule-based plan from your current workload.`
      : `You have ${data.pendingTasks.length} pending tasks and ${data.completedTasks} completed tasks. Keep the next block mixed and timer-backed.`,
    tomorrowPlan: urgent.map((task) => `${task.subjectId}: ${task.type} ${task.topicId}`),
    weakTopics: urgent.slice(0, 3).map((task) => task.topicId),
    revisionSuggestions: data.pendingTasks.filter((task) => task.type === "revision").slice(0, 3).map((task) => task.topicId),
    burnoutRisk: data.distractionMinutesWeek > 600 ? "high" : data.distractionMinutesWeek > 240 ? "medium" : "low",
  } as const;
};

const priorityRank = (priority: string) => priority === "critical" ? 4 : priority === "high" ? 3 : priority === "medium" ? 2 : 1;

const extractJson = (content: unknown) => {
  if (typeof content !== "string") return undefined;
  const direct = content.trim();
  if (direct.startsWith("{") && direct.endsWith("}")) return direct;
  const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;
  const object = direct.match(/\{[\s\S]*\}/)?.[0];
  return object;
};

const requestOpenRouter = async (request: Request, data: CoachInput, useJsonMode: boolean) => {
  const prompt = [
    "You are an SSC CGL study coach.",
    "Return only JSON matching this TypeScript shape:",
    '{ "summary": string, "tomorrowPlan": string[], "weakTopics": string[], "revisionSuggestions": string[], "burnoutRisk": "low" | "medium" | "high" }',
    "Use this aggregate data:",
    JSON.stringify(data),
  ].join("\n");

  const body: Record<string, unknown> = {
    model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    messages: [
      { role: "system", content: "You are a strict JSON API. Do not include markdown." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
  };
  if (useJsonMode) body.response_format = { type: "json_object" };

  return fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "SSC War Room",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
};

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid coach input" }, { status: 400 });

  if (!process.env.OPENROUTER_API_KEY) return NextResponse.json(fallbackReport(parsed.data, "missing OPENROUTER_API_KEY"));

  try {
    let upstream = await requestOpenRouter(request, parsed.data, true);
    if (!upstream.ok) upstream = await requestOpenRouter(request, parsed.data, false);
    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => "");
      return NextResponse.json(fallbackReport(parsed.data, errorText || `OpenRouter HTTP ${upstream.status}`));
    }

    const result = await upstream.json();
    const content = result?.choices?.[0]?.message?.content;
    const json = extractJson(content);
    if (!json) return NextResponse.json(fallbackReport(parsed.data, "empty model response"));

    const report = reportSchema.safeParse(JSON.parse(json));
    return NextResponse.json(report.success ? report.data : fallbackReport(parsed.data, "invalid report shape"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : "request failed";
    return NextResponse.json(fallbackReport(parsed.data, reason));
  }
}
