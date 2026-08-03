"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Plus, Trash2 } from "lucide-react";

import {
  deletePlan,
  fetchAllPlans,
  type TimetablePlanSummary,
} from "@/lib/timetable-api";

export default function TimetableList({
  tr,
  onCreate,
  onOpen,
}: {
  tr: (cn: string, en: string) => string;
  onCreate: () => void;
  onOpen: (planId: string) => void;
}) {
  const [plans, setPlans] = useState<TimetablePlanSummary[] | null>(null);

  const load = () => {
    fetchAllPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  };

  useEffect(load, []);

  const handleDelete = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!window.confirm(tr("确定要删除这个时间表吗？", "Delete this timetable?"))) return;
    await deletePlan(planId).catch(() => {});
    load();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[24px] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
            {tr("时间表规划", "Timetable Planner")}
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-[var(--muted-foreground)]">
            {tr(
              "上传教学大纲，回答几个问题，获得逐日的学习、练习与复习安排。",
              "Upload a syllabus, answer a few questions, and get a day-by-day plan for learning, practicing, and revising.",
            )}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--primary)] px-3.5 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 cursor-pointer"
        >
          <Plus size={15} strokeWidth={2} />
          {tr("新建时间表", "New Timetable")}
        </button>
      </header>

      {plans === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-[var(--border)] bg-[var(--card)]"
            />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <button
          onClick={onCreate}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-16 text-center transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--accent)] cursor-pointer"
        >
          <CalendarClock size={28} strokeWidth={1.5} className="text-[var(--muted-foreground)]" />
          <span className="text-[13.5px] text-[var(--muted-foreground)]">
            {tr("还没有时间表 — 点击创建第一个", "No timetables yet — create your first one")}
          </span>
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan, i) => {
            const pct = plan.total_items > 0 ? Math.round((plan.done_items / plan.total_items) * 100) : 0;
            return (
              <motion.div
                key={plan.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(plan.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(plan.id);
                  }
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--foreground)]/20 hover:shadow-[0_6px_20px_-12px_rgba(0,0,0,0.25)] cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-[14.5px] font-medium leading-tight tracking-tight text-[var(--foreground)]">
                    {plan.name}
                  </h3>
                  <button
                    onClick={(e) => handleDelete(e, plan.id)}
                    className="shrink-0 rounded p-1 text-[var(--muted-foreground)]/50 opacity-0 transition-opacity hover:text-[var(--destructive)] group-hover:opacity-100 cursor-pointer"
                    aria-label={tr("删除", "Delete")}
                  >
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                </div>
                <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                  {plan.start_date} · {plan.weeks} {tr("周", "weeks")}
                  {plan.unscheduled_topics > 0 && (
                    <span className="ml-1.5 text-[var(--destructive)]">
                      · {plan.unscheduled_topics} {tr("未排入", "unscheduled")}
                    </span>
                  )}
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11.5px] text-[var(--muted-foreground)]">
                  {plan.done_items}/{plan.total_items} {tr("已完成", "done")} · {pct}%
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
