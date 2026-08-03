"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { TimetablePlan } from "@/lib/timetable-api";
import { subjectColor } from "@/components/timetable/subjectColors";
import { WEEKDAY_LABEL } from "./activityMeta";

const MAX_CHIPS_PER_CELL = 3;

function isoDate(d: Date): string {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/** 6 rows x 7 cols (Mon-start) covering `year`/`month` (0-indexed), including
 * lead/trail days from adjacent months so the grid is always full. */
function buildMonthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const firstWeekday = (first.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(year, month, 1 - firstWeekday);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export default function MonthCalendarView({
  plan,
  subjectIndex,
  tr,
  initialMonth,
  onSelectDay,
}: {
  plan: TimetablePlan;
  subjectIndex: Map<string, number>;
  tr: (cn: string, en: string) => string;
  initialMonth: string; // any date within the desired starting month
  onSelectDay: (date: string) => void;
}) {
  const initial = new Date(initialMonth + "T00:00:00");
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const daysByDate = useMemo(() => {
    const map = new Map<string, TimetablePlan["days"][number]>();
    plan.days.forEach((d) => map.set(d.date, d));
    return map;
  }, [plan.days]);

  const matrix = useMemo(() => buildMonthMatrix(year, month), [year, month]);
  const today = isoDate(new Date());

  const goPrev = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const goNext = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[13px] font-medium text-[var(--foreground)]">{monthLabel}</span>
        <div className="flex gap-1">
          <button
            onClick={goPrev}
            className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
            aria-label={tr("上个月", "Previous month")}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={goNext}
            className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
            aria-label={tr("下个月", "Next month")}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABEL.map((label) => (
          <div
            key={label.en}
            className="px-1 pb-1 text-center text-[10px] font-medium text-[var(--muted-foreground)]"
          >
            {tr(label.cn, label.en)}
          </div>
        ))}

        {matrix.flat().map((date) => {
          const dateStr = isoDate(date);
          const inMonth = date.getMonth() === month;
          const day = daysByDate.get(dateStr);
          const isToday = dateStr === today;
          const items = day?.items ?? [];
          const overflow = Math.max(0, items.length - MAX_CHIPS_PER_CELL);

          return (
            <button
              key={dateStr}
              onClick={() => day && onSelectDay(dateStr)}
              disabled={!day}
              className={`flex min-h-[72px] flex-col items-start gap-0.5 rounded-md border p-1 text-left transition-colors ${
                inMonth ? "border-[var(--border)]" : "border-transparent opacity-40"
              } ${day ? "cursor-pointer hover:bg-[var(--accent)]/60" : "cursor-default"} ${
                isToday ? "bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]/40" : ""
              }`}
            >
              <span
                className={`text-[11px] tabular-nums ${
                  isToday ? "font-semibold text-[var(--primary)]" : "text-[var(--foreground)]"
                }`}
              >
                {date.getDate()}
              </span>
              <div className="flex w-full flex-col gap-0.5">
                {items.slice(0, MAX_CHIPS_PER_CELL).map((item) => {
                  const colors = subjectColor(subjectIndex.get(item.subject_id) ?? 0);
                  return (
                    <span
                      key={item.id}
                      className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[9px] ${colors.tile} ${
                        item.done ? "opacity-50 line-through" : ""
                      }`}
                    >
                      <span className={`h-1 w-1 shrink-0 rounded-full ${colors.dot}`} />
                      {item.topic_name}
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <span className="text-[9px] text-[var(--muted-foreground)]">
                    +{overflow} {tr("更多", "more")}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
