import { apiUrl, apiFetch } from "./api";

export type ActivityType = "learn" | "practice" | "revision";

export interface SyllabusTopic {
  id: string;
  name: string;
  order: number;
  difficulty: number;
}

export interface SyllabusChapter {
  id: string;
  name: string;
  order: number;
  topics: SyllabusTopic[];
}

export interface SyllabusSubject {
  id: string;
  name: string;
  order: number;
  include: boolean;
  weight: number;
  chapters: SyllabusChapter[];
}

export interface TimetableConstraints {
  start_date: string;
  weeks: number;
  daily_minutes: Record<string, number>;
  learn_ratio: number;
  practice_ratio: number;
  revision_ratio: number;
  /** 24h "HH:MM" clock time the scheduler stacks each day's items from. */
  day_start_time: string;
}

export interface TimetableItem {
  id: string;
  subject_id: string;
  subject_name: string;
  chapter_name: string;
  topic_name: string;
  activity: ActivityType;
  minutes: number;
  done: boolean;
  /** 24h "HH:MM"; "" means unscheduled (e.g. legacy data). */
  start_time: string;
}

export interface TimetableDay {
  date: string;
  weekday: number;
  items: TimetableItem[];
}

export interface TimetablePlan {
  id: string;
  name: string;
  subjects: SyllabusSubject[];
  constraints: TimetableConstraints;
  days: TimetableDay[];
  unscheduled_topics: number;
  version: number;
  created_at: number;
  updated_at: number;
}

export interface TimetablePlanSummary {
  id: string;
  name: string;
  start_date: string;
  weeks: number;
  total_items: number;
  done_items: number;
  unscheduled_topics: number;
  updated_at: number;
}

// Loosely typed subject/chapter/topic shape used only for the "generate
// plan" request body — a subset of SyllabusSubject the review step edits.
export interface SubjectInput {
  name: string;
  include: boolean;
  weight: number;
  chapters: {
    name: string;
    topics: { name: string; difficulty: number }[];
  }[];
}

async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (body?.detail) return String(body.detail);
  } catch {
    // body wasn't JSON; fall through
  }
  return fallback;
}

export async function extractSyllabus(
  file: File,
): Promise<{ subjects: SyllabusSubject[] }> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(apiUrl("/api/v1/timetable/extract-syllabus"), {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, "Failed to extract syllabus"));
  }
  return res.json();
}

export async function generatePlan(
  name: string,
  subjects: SubjectInput[],
  constraints: TimetableConstraints,
): Promise<TimetablePlan> {
  const res = await apiFetch(apiUrl("/api/v1/timetable/plans/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, subjects, constraints }),
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, "Failed to generate timetable"));
  }
  return res.json();
}

export async function fetchAllPlans(): Promise<TimetablePlanSummary[]> {
  const res = await apiFetch(apiUrl("/api/v1/timetable/plans"));
  if (!res.ok) throw new Error(`Failed to fetch plans: ${res.status}`);
  const data = await res.json();
  return data.plans as TimetablePlanSummary[];
}

export async function fetchPlan(planId: string): Promise<TimetablePlan> {
  const res = await apiFetch(
    apiUrl(`/api/v1/timetable/plans/${encodeURIComponent(planId)}`),
  );
  if (!res.ok) throw new Error(`Failed to fetch plan: ${res.status}`);
  return res.json();
}

export async function toggleItem(
  planId: string,
  dayDate: string,
  itemId: string,
  done: boolean,
): Promise<TimetablePlan> {
  const res = await apiFetch(
    apiUrl(
      `/api/v1/timetable/plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`,
    ),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day_date: dayDate, done }),
    },
  );
  if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
  return res.json();
}

export async function deletePlan(planId: string): Promise<void> {
  const res = await apiFetch(
    apiUrl(`/api/v1/timetable/plans/${encodeURIComponent(planId)}`),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`Failed to delete plan: ${res.status}`);
}

export interface UpcomingEvent {
  plan_id: string;
  plan_name: string;
  day_date: string;
  item: TimetableItem;
}

export async function fetchUpcoming(days = 7): Promise<UpcomingEvent[]> {
  const res = await apiFetch(
    apiUrl(`/api/v1/timetable/upcoming?days=${encodeURIComponent(days)}`),
  );
  if (!res.ok) throw new Error(`Failed to fetch upcoming events: ${res.status}`);
  const data = await res.json();
  return data.events as UpcomingEvent[];
}

export async function addQuickEvent(params: {
  title: string;
  date: string;
  subject_name?: string;
  activity?: ActivityType;
  minutes?: number;
  time?: string;
}): Promise<{ plan_id: string; item: TimetableItem }> {
  const res = await apiFetch(apiUrl("/api/v1/timetable/quick-events"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to add event"));
  return res.json();
}
