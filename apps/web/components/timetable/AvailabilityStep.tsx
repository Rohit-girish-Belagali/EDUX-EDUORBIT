"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";

import type { TimetableConstraints } from "@/lib/timetable-api";

const WEEKDAY_LABEL: { cn: string; en: string }[] = [
  { cn: "周一", en: "Mon" },
  { cn: "周二", en: "Tue" },
  { cn: "周三", en: "Wed" },
  { cn: "周四", en: "Thu" },
  { cn: "周五", en: "Fri" },
  { cn: "周六", en: "Sat" },
  { cn: "周日", en: "Sun" },
];

function todayIso(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function AvailabilityStep({
  tr,
  defaultName,
  onBack,
  onContinue,
}: {
  tr: (cn: string, en: string) => string;
  defaultName: string;
  onBack: () => void;
  onContinue: (name: string, constraints: TimetableConstraints) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [startDate, setStartDate] = useState(todayIso());
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [weeks, setWeeks] = useState(4);
  const [minutes, setMinutes] = useState<number[]>([60, 60, 60, 60, 60, 30, 30]);
  const [learnPct, setLearnPct] = useState(50);
  const [practicePct, setPracticePct] = useState(30);
  const [revisionPct, setRevisionPct] = useState(20);

  const ratioSum = learnPct + practicePct + revisionPct;
  const ratioValid = ratioSum >= 95 && ratioSum <= 105;

  const weeklyTotal = useMemo(
    () => minutes.reduce((a, b) => a + b, 0),
    [minutes],
  );

  const applyPreset = (weekday: number, weekend: number) =>
    setMinutes([weekday, weekday, weekday, weekday, weekday, weekend, weekend]);

  const handleContinue = () => {
    const constraints: TimetableConstraints = {
      start_date: startDate,
      weeks,
      daily_minutes: Object.fromEntries(minutes.map((m, i) => [String(i), m])),
      learn_ratio: learnPct / 100,
      practice_ratio: practicePct / 100,
      revision_ratio: revisionPct / 100,
      day_start_time: dayStartTime,
    };
    onContinue(name.trim() || defaultName, constraints);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-[17px] font-semibold text-[var(--foreground)]">
        {tr("你的学习时间", "Your study time")}
      </h2>
      <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
        {tr("告诉我们你每天能投入多少时间，我们会据此安排每日计划。", "Tell us how much time you can give each day, and we'll build the plan around it.")}
      </p>

      {/* Plan name */}
      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
          {tr("计划名称", "Plan name")}
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-sm rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
        />
      </label>

      {/* Start date + weeks */}
      <div className="mt-6 flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
            {tr("开始日期", "Start date")}
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
            {tr("持续周数", "Duration (weeks)")}
          </span>
          <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-1 py-1">
            <button
              onClick={() => setWeeks((w) => Math.max(1, w - 1))}
              className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
            >
              <Minus size={13} />
            </button>
            <span className="w-8 text-center text-[13px] tabular-nums text-[var(--foreground)]">{weeks}</span>
            <button
              onClick={() => setWeeks((w) => Math.min(52, w + 1))}
              className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
            >
              <Plus size={13} />
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
            {tr("每日开始时间", "Daily start time")}
          </span>
          <input
            type="time"
            value={dayStartTime}
            onChange={(e) => setDayStartTime(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          />
        </label>
      </div>

      {/* Daily minutes grid */}
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
            {tr("每日可用时间（分钟）", "Daily availability (minutes)")}
          </span>
          <div className="flex gap-1.5 text-[11px]">
            <button
              onClick={() => applyPreset(60, 30)}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
            >
              {tr("轻松", "Light")}
            </button>
            <button
              onClick={() => applyPreset(90, 60)}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
            >
              {tr("适中", "Balanced")}
            </button>
            <button
              onClick={() => applyPreset(150, 120)}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
            >
              {tr("冲刺", "Intense")}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_LABEL.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-[var(--muted-foreground)]">{tr(label.cn, label.en)}</span>
              <input
                type="number"
                min={0}
                max={480}
                step={15}
                value={minutes[i]}
                onChange={(e) =>
                  setMinutes((prev) => prev.map((m, idx) => (idx === i ? Math.max(0, Number(e.target.value)) : m)))
                }
                className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-1.5 text-center text-[12.5px] tabular-nums text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--muted-foreground)]">
          {tr("每周共计", "Total per week")}: {Math.round((weeklyTotal / 60) * 10) / 10} {tr("小时", "hours")}
        </p>
      </div>

      {/* Ratio split */}
      <div className="mt-7">
        <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
          {tr("时间分配：学习 / 练习 / 复习", "Time split: Learn / Practice / Revision")}
        </span>
        <div className="mt-2 space-y-2.5">
          {[
            { label: tr("学习", "Learn"), value: learnPct, set: setLearnPct, color: "bg-sky-500" },
            { label: tr("练习", "Practice"), value: practicePct, set: setPracticePct, color: "bg-emerald-500" },
            { label: tr("复习", "Revision"), value: revisionPct, set: setRevisionPct, color: "bg-amber-500" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-[12px] text-[var(--foreground)]">{row.label}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={row.value}
                onChange={(e) => row.set(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-[var(--primary)]"
              />
              <span className="w-10 shrink-0 text-right text-[12px] tabular-nums text-[var(--muted-foreground)]">
                {row.value}%
              </span>
            </div>
          ))}
        </div>
        <p className={`mt-1.5 text-[11.5px] ${ratioValid ? "text-[var(--muted-foreground)]" : "text-[var(--destructive)]"}`}>
          {tr("合计", "Total")}: {ratioSum}%{!ratioValid && ` — ${tr("需接近 100%", "should be close to 100%")}`}
        </p>
      </div>

      <div className="mt-7 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-md px-3 py-2 text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
        >
          {tr("返回", "Back")}
        </button>
        <button
          disabled={!ratioValid || weeklyTotal === 0}
          onClick={handleContinue}
          className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          {tr("生成时间表", "Generate Timetable")}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
