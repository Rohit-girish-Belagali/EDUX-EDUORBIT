import type { TimetableItem } from "@/lib/timetable-api";

// Shared geometry for the Outlook-style hour-row calendars (Week + Day views
// share this via TimeGridCalendarView; Month view doesn't need it).
export const GRID_START_MINUTES = 6 * 60; // 06:00
export const GRID_END_MINUTES = 23 * 60; // 23:00
export const HOUR_HEIGHT_PX = 56;
export const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;

export function parseHHMM(text: string | undefined | null): number | null {
  if (!text) return null;
  const [hh, mm] = text.split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function formatHHMM(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "9 AM", "12 PM", "1:30 PM" — for the hour gutter and event block labels. */
export function formatClockLabel(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const period = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export interface PositionedItem {
  item: TimetableItem;
  top: number;
  height: number;
}

/**
 * Split a day's items into ones with a usable start_time (positioned within
 * the grid, clamped to its bounds so nothing renders off-screen) and ones
 * without (legacy/unscheduled data) — the latter get listed separately by
 * the caller rather than silently dropped.
 */
export function layoutItemsForDay(items: TimetableItem[]): {
  positioned: PositionedItem[];
  unscheduled: TimetableItem[];
} {
  const positioned: PositionedItem[] = [];
  const unscheduled: TimetableItem[] = [];
  const gridSpan = GRID_END_MINUTES - GRID_START_MINUTES;

  for (const item of items) {
    const start = parseHHMM(item.start_time);
    if (start === null) {
      unscheduled.push(item);
      continue;
    }
    const clampedStart = Math.min(Math.max(start, GRID_START_MINUTES), GRID_END_MINUTES);
    const clampedEnd = Math.min(
      Math.max(start + item.minutes, GRID_START_MINUTES),
      GRID_END_MINUTES + gridSpan, // allow slight overflow past the last hour, still positioned
    );
    const top = (clampedStart - GRID_START_MINUTES) * PX_PER_MINUTE;
    const height = Math.max(18, (clampedEnd - clampedStart) * PX_PER_MINUTE);
    positioned.push({ item, top, height });
  }

  positioned.sort((a, b) => a.top - b.top);
  return { positioned, unscheduled };
}

export function currentMinutesOfDay(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
