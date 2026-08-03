import { apiFetch, apiUrl } from "./core";

export type ActivityType = "learn" | "practice" | "revision";

export interface TimetableItem {
  id: string; subject_id: string; subject_name: string;
  chapter_name: string; topic_name: string;
  activity: ActivityType; minutes: number; done: boolean; start_time: string;
}

export interface TimetableDay { date: string; weekday: number; items: TimetableItem[]; }

export interface TimetablePlanSummary {
  id: string; name: string; start_date: string; weeks: number;
  total_items: number; done_items: number; unscheduled_topics: number; updated_at: number;
}

export interface TimetablePlan {
  id: string; name: string;
  subjects: unknown[]; constraints: Record<string, unknown>;
  days: TimetableDay[]; unscheduled_topics: number;
  version: number; created_at: number; updated_at: number;
}

export interface UpcomingEvent { plan_id: string; plan_name: string; day_date: string; item: TimetableItem; }

async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  try { const body = await res.json(); if ((body as { detail?: string }).detail) return String((body as { detail: string }).detail); } catch { /* not JSON */ }
  return fallback;
}

export async function fetchAllPlans(): Promise<TimetablePlanSummary[]> {
  const res = await apiFetch(apiUrl("/api/v1/timetable/plans"));
  if (!res.ok) throw new Error(`Failed to fetch plans: ${res.status}`);
  const data = await res.json();
  return (data as { plans: TimetablePlanSummary[] }).plans;
}

export async function fetchPlan(planId: string): Promise<TimetablePlan> {
  const res = await apiFetch(apiUrl(`/api/v1/timetable/plans/${encodeURIComponent(planId)}`));
  if (!res.ok) throw new Error(`Failed to fetch plan: ${res.status}`);
  return res.json();
}

export async function toggleItem(planId: string, dayDate: string, itemId: string, done: boolean): Promise<TimetablePlan> {
  const res = await apiFetch(apiUrl(`/api/v1/timetable/plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ day_date: dayDate, done }),
  });
  if (!res.ok) throw new Error(`Failed to update item: ${res.status}`);
  return res.json();
}

export async function deletePlan(planId: string): Promise<void> {
  const res = await apiFetch(apiUrl(`/api/v1/timetable/plans/${encodeURIComponent(planId)}`), { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete plan: ${res.status}`);
}

export async function fetchUpcoming(days = 7): Promise<UpcomingEvent[]> {
  const res = await apiFetch(apiUrl(`/api/v1/timetable/upcoming?days=${encodeURIComponent(days)}`));
  if (!res.ok) throw new Error(`Failed to fetch upcoming events: ${res.status}`);
  const data = await res.json();
  return (data as { events: UpcomingEvent[] }).events;
}

export async function generatePlan(name: string, subjects: unknown[], constraints: Record<string, unknown>): Promise<TimetablePlan> {
  const res = await apiFetch(apiUrl("/api/v1/timetable/plans/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, subjects, constraints }),
  });
  if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to generate timetable"));
  return res.json();
}
