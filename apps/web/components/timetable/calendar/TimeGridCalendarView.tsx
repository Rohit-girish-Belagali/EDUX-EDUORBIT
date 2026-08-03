"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import type { TimetableDay, TimetableItem } from "@/lib/timetable-api";
import { subjectColor } from "@/components/timetable/subjectColors";
import { ACTIVITY_ICON, WEEKDAY_LABEL } from "./activityMeta";
import {
  GRID_START_MINUTES,
  GRID_END_MINUTES,
  HOUR_HEIGHT_PX,
  PX_PER_MINUTE,
  currentMinutesOfDay,
  formatClockLabel,
  layoutItemsForDay,
} from "./calendarLayout";

const todayIso = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const HOURS = (() => {
  const hours: number[] = [];
  for (let m = GRID_START_MINUTES; m < GRID_END_MINUTES; m += 60) hours.push(m);
  return hours;
})();

const GRID_HEIGHT = (GRID_END_MINUTES - GRID_START_MINUTES) * PX_PER_MINUTE;

/**
 * Shared Outlook-style hour-row grid engine. Renders 1 column for Day view
 * or 7 for Week view — the caller decides how many `days` to pass.
 */
export default function TimeGridCalendarView({
  days,
  subjectIndex,
  tr,
  onToggle,
}: {
  days: TimetableDay[];
  subjectIndex: Map<string, number>;
  tr: (cn: string, en: string) => string;
  onToggle: (dayDate: string, item: TimetableItem) => void;
}) {
  const [nowMinutes, setNowMinutes] = useState(currentMinutesOfDay());
  const today = todayIso();

  useEffect(() => {
    const id = setInterval(() => setNowMinutes(currentMinutesOfDay()), 60_000);
    return () => clearInterval(id);
  }, []);

  const columns = useMemo(
    () => days.map((day) => ({ day, ...layoutItemsForDay(day.items) })),
    [days],
  );

  const nowTop = (nowMinutes - GRID_START_MINUTES) * PX_PER_MINUTE;
  const showNowLine = nowMinutes >= GRID_START_MINUTES && nowMinutes <= GRID_END_MINUTES;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
      {/* Day headers */}
      <div className="flex border-b border-[var(--border)]">
        <div className="w-14 shrink-0" />
        {columns.map(({ day }) => {
          const isToday = day.date === today;
          const d = new Date(day.date + "T00:00:00");
          return (
            <div
              key={day.date}
              className={`flex flex-1 flex-col items-center gap-0.5 border-l border-[var(--border)] py-2 ${
                isToday ? "bg-[var(--primary)]/5" : ""
              }`}
            >
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {tr(WEEKDAY_LABEL[day.weekday].cn, WEEKDAY_LABEL[day.weekday].en)}
              </span>
              <span
                className={`text-[13px] tabular-nums ${
                  isToday ? "font-semibold text-[var(--primary)]" : "text-[var(--foreground)]"
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hour grid */}
      <div className="flex overflow-y-auto" style={{ maxHeight: 560 }}>
        <div className="w-14 shrink-0">
          {HOURS.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT_PX }}
              className="flex items-start justify-end pr-2 pt-0.5 text-[10px] text-[var(--muted-foreground)]"
            >
              {formatClockLabel(h)}
            </div>
          ))}
        </div>

        {columns.map(({ day, positioned, unscheduled }) => (
          <div
            key={day.date}
            className="relative flex-1 border-l border-[var(--border)]"
            style={{ height: GRID_HEIGHT }}
          >
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-[var(--border)]/50"
                style={{ top: (h - GRID_START_MINUTES) * PX_PER_MINUTE }}
              />
            ))}

            {day.date === today && showNowLine && (
              <div
                className="absolute left-0 right-0 z-10 border-t-2 border-[var(--destructive)]"
                style={{ top: nowTop }}
              >
                <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[var(--destructive)]" />
              </div>
            )}

            {unscheduled.length > 0 && (
              <div className="absolute left-0.5 right-0.5 top-0.5 z-0 text-[9px] text-[var(--muted-foreground)]/70">
                {unscheduled.length} {tr("未排定时间", "unscheduled")}
              </div>
            )}

            {positioned.map(({ item, top, height }) => {
              const Icon = ACTIVITY_ICON[item.activity];
              const colors = subjectColor(subjectIndex.get(item.subject_id) ?? 0);
              const compact = height < 34;
              return (
                <button
                  key={item.id}
                  onClick={() => onToggle(day.date, item)}
                  style={{ top, height, left: 2, right: 2 }}
                  className={`group absolute overflow-hidden rounded-md border px-1.5 py-0.5 text-left transition-opacity hover:opacity-90 cursor-pointer ${colors.tile} ${colors.border} ${
                    item.done ? "opacity-50" : ""
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {item.done ? (
                      <Check size={10} strokeWidth={2.2} className="shrink-0" />
                    ) : (
                      <Icon size={10} strokeWidth={1.8} className="shrink-0" />
                    )}
                    <span
                      className={`truncate text-[10.5px] font-medium ${item.done ? "line-through" : ""}`}
                    >
                      {item.topic_name}
                    </span>
                  </span>
                  {!compact && (
                    <span className="block truncate text-[9.5px] opacity-80">
                      {item.subject_name} · {item.minutes}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
