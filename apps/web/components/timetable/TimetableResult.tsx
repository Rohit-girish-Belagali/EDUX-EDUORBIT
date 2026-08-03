"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  AlertTriangle,
  ArrowLeft,
  Check,
  LayoutGrid,
  CalendarRange,
  Calendar,
  CalendarDays,
} from "lucide-react";

import { toggleItem, type TimetableItem, type TimetablePlan } from "@/lib/timetable-api";
import { subjectColor } from "./subjectColors";
import { ACTIVITY_ICON, ACTIVITY_LABEL, WEEKDAY_LABEL } from "./calendar/activityMeta";
import TimeGridCalendarView from "./calendar/TimeGridCalendarView";
import MonthCalendarView from "./calendar/MonthCalendarView";

type ViewMode = "cards" | "week" | "month" | "day";

const VIEW_TABS: { mode: ViewMode; icon: typeof LayoutGrid; label: { cn: string; en: string } }[] = [
  { mode: "cards", icon: LayoutGrid, label: { cn: "卡片", en: "Cards" } },
  { mode: "week", icon: CalendarRange, label: { cn: "周", en: "Week" } },
  { mode: "month", icon: Calendar, label: { cn: "月", en: "Month" } },
  { mode: "day", icon: CalendarDays, label: { cn: "日", en: "Day" } },
];

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function todayIso(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function TimetableResult({
  tr,
  initialPlan,
  onBack,
}: {
  tr: (cn: string, en: string) => string;
  initialPlan: TimetablePlan;
  onBack: () => void;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [expandedDate, setExpandedDate] = useState<string | null>(
    plan.days.find((d) => d.items.length > 0)?.date ?? null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [focusedDate, setFocusedDate] = useState<string>(
    plan.days.find((d) => d.items.length > 0)?.date ?? plan.days[0]?.date ?? todayIso(),
  );
  const reduceMotion = useReducedMotion();

  const subjectIndex = useMemo(() => {
    const map = new Map<string, number>();
    plan.subjects.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [plan.subjects]);

  const { totalItems, doneItems } = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const day of plan.days) {
      for (const item of day.items) {
        total += 1;
        if (item.done) done += 1;
      }
    }
    return { totalItems: total, doneItems: done };
  }, [plan.days]);
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const weeks = useMemo(() => chunk(plan.days, 7), [plan.days]);

  const currentWeekDays = useMemo(
    () => weeks.find((w) => w.some((d) => d.date === focusedDate)) ?? weeks[0] ?? [],
    [weeks, focusedDate],
  );
  const focusedDay = useMemo(
    () => plan.days.find((d) => d.date === focusedDate) ?? plan.days[0],
    [plan.days, focusedDate],
  );

  const handleToggle = async (dayDate: string, item: TimetableItem) => {
    const nextDone = !item.done;
    setPlan((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.date !== dayDate
          ? d
          : { ...d, items: d.items.map((it) => (it.id === item.id ? { ...it, done: nextDone } : it)) },
      ),
    }));
    try {
      await toggleItem(plan.id, dayDate, item.id, nextDone);
    } catch {
      // revert on failure
      setPlan((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.date !== dayDate
            ? d
            : { ...d, items: d.items.map((it) => (it.id === item.id ? { ...it, done: !nextDone } : it)) },
        ),
      }));
    }
  };

  return (
    <div className={`mx-auto px-6 py-8 ${viewMode === "cards" ? "max-w-4xl" : "max-w-6xl"}`}>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-[12.5px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
      >
        <ArrowLeft size={14} /> {tr("所有时间表", "All timetables")}
      </button>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-[22px] font-semibold tracking-tight text-[var(--foreground)]">
            {plan.name}
          </h1>
          <p className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">
            {plan.constraints.start_date} · {plan.constraints.weeks} {tr("周", "weeks")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-[var(--muted)]">
            <motion.div
              className="h-full rounded-full bg-[var(--primary)]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-[12.5px] tabular-nums text-[var(--muted-foreground)]">
            {doneItems}/{totalItems} · {pct}%
          </span>
        </div>
      </header>

      {/* View switcher */}
      <div className="mb-6 flex w-fit gap-0.5 rounded-md bg-[var(--muted)] p-0.5">
        {VIEW_TABS.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
              viewMode === mode
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={13} strokeWidth={1.8} />
            {tr(label.cn, label.en)}
          </button>
        ))}
      </div>

      {plan.unscheduled_topics > 0 && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3 text-[12.5px] text-[var(--destructive)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {plan.unscheduled_topics}{" "}
            {tr(
              "个主题未能排入计划 — 尝试增加周数或每日可用时间。",
              "topics didn't fit into the plan — try adding more weeks or daily time.",
            )}
          </span>
        </div>
      )}

      {/* Subject legend */}
      <div className="mb-6 flex flex-wrap gap-3">
        {plan.subjects
          .filter((s) => s.include && s.chapters.length > 0)
          .map((s) => {
            const colors = subjectColor(subjectIndex.get(s.id) ?? 0);
            return (
              <span key={s.id} className="flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                {s.name}
              </span>
            );
          })}
      </div>

      {viewMode === "cards" && (
      <div className="space-y-8">
        {weeks.map((weekDays, wi) => (
          <section key={wi}>
            <h2 className="mb-2.5 text-[12px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              {tr("第", "Week")} {wi + 1} {tr("周", "")}
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, di) => {
                const globalIndex = wi * 7 + di;
                const isExpanded = expandedDate === day.date;
                const isEmpty = day.items.length === 0;
                const totalMinutes = day.items.reduce((a, it) => a + it.minutes, 0);
                const doneCount = day.items.filter((it) => it.done).length;
                const dayDate = new Date(day.date + "T00:00:00");
                const isToday = day.date === new Date().toISOString().slice(0, 10);

                return (
                  <motion.div
                    key={day.date}
                    initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: reduceMotion ? 0 : Math.min(globalIndex * 0.015, 0.5),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className={`rounded-lg border ${
                      isToday ? "border-[var(--primary)]/50" : "border-[var(--border)]"
                    } ${isEmpty ? "bg-[var(--muted)]/30" : "bg-[var(--card)]"}`}
                  >
                    <button
                      onClick={() => !isEmpty && setExpandedDate(isExpanded ? null : day.date)}
                      className={`flex w-full flex-col items-center gap-1 px-1.5 py-2 ${
                        isEmpty ? "cursor-default" : "cursor-pointer"
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
                        {dayDate.getDate()}
                      </span>
                      {isEmpty ? (
                        <span className="h-1.5" />
                      ) : (
                        <div className="flex items-center gap-1">
                          {Array.from(
                            new Set(day.items.map((it) => it.subject_id)),
                          ).map((sid) => {
                            const colors = subjectColor(subjectIndex.get(sid) ?? 0);
                            return <span key={sid} className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />;
                          })}
                        </div>
                      )}
                      {!isEmpty && (
                        <span className="text-[9.5px] text-[var(--muted-foreground)]">
                          {doneCount === day.items.length ? (
                            <Check size={11} className="text-[var(--primary)]" />
                          ) : (
                            `${totalMinutes}m`
                          )}
                        </span>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence>
              {weekDays.some((d) => d.date === expandedDate) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  {weekDays
                    .filter((d) => d.date === expandedDate)
                    .map((day) => (
                      <div
                        key={day.date}
                        className="mt-2 space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--muted-foreground)]">
                          <ChevronDown size={13} />
                          {day.date}
                        </div>
                        {day.items.map((item) => {
                          const Icon = ACTIVITY_ICON[item.activity];
                          const colors = subjectColor(subjectIndex.get(item.subject_id) ?? 0);
                          return (
                            <label
                              key={item.id}
                              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--accent)] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => handleToggle(day.date, item)}
                                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
                              />
                              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${colors.tile}`}>
                                <Icon size={12} strokeWidth={1.8} />
                              </span>
                              <span
                                className={`min-w-0 flex-1 truncate text-[12.5px] ${
                                  item.done
                                    ? "text-[var(--muted-foreground)] line-through"
                                    : "text-[var(--foreground)]"
                                }`}
                              >
                                {item.topic_name}
                                <span className="ml-1.5 text-[var(--muted-foreground)]">
                                  · {item.subject_name}
                                </span>
                              </span>
                              <span className="shrink-0 text-[11px] text-[var(--muted-foreground)]">
                                {tr(ACTIVITY_LABEL[item.activity].cn, ACTIVITY_LABEL[item.activity].en)} ·{" "}
                                {item.minutes}m
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        ))}
      </div>
      )}

      {viewMode === "week" && (
        <TimeGridCalendarView
          days={currentWeekDays}
          subjectIndex={subjectIndex}
          tr={tr}
          onToggle={handleToggle}
        />
      )}

      {viewMode === "day" && focusedDay && (
        <TimeGridCalendarView
          days={[focusedDay]}
          subjectIndex={subjectIndex}
          tr={tr}
          onToggle={handleToggle}
        />
      )}

      {viewMode === "month" && (
        <MonthCalendarView
          plan={plan}
          subjectIndex={subjectIndex}
          tr={tr}
          initialMonth={focusedDate}
          onSelectDay={(date) => {
            setFocusedDate(date);
            setViewMode("day");
          }}
        />
      )}
    </div>
  );
}
