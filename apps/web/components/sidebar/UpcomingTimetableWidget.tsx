"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Link2,
  PencilLine,
  Plus,
  RotateCcw,
} from "lucide-react";

import {
  addQuickEvent,
  fetchPlan,
  fetchUpcoming,
  toggleItem,
  type ActivityType,
  type TimetableItem,
  type UpcomingEvent,
} from "@/lib/timetable-api";
import { subjectColor } from "@/components/timetable/subjectColors";

const ACTIVITY_ICON: Record<ActivityType, typeof BookOpen> = {
  learn: BookOpen,
  practice: PencilLine,
  revision: RotateCcw,
};

const VISIBLE_COUNT = 5;

// Subjects live across many independent plans here (unlike the single-plan
// TimetableResult view), so there's no shared `plan.subjects` order to index
// into — hash the id instead for a color that's at least stable per subject.
function colorForSubjectId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return subjectColor(hash);
}

function relativeDateLabel(dateStr: string, tr: (cn: string, en: string) => string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return tr("今天", "Today");
  if (diffDays === 1) return tr("明天", "Tomorrow");
  return target.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function todayIso(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function roundedTimeNow(): string {
  const d = new Date();
  const minutes = d.getMinutes() <= 30 ? 30 : 0;
  const hours = d.getMinutes() <= 30 ? d.getHours() : (d.getHours() + 1) % 24;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function UpcomingTimetableWidget() {
  const { i18n } = useTranslation();
  const zh = i18n.language?.toLowerCase().startsWith("zh");
  const tr = useCallback((cn: string, en: string) => (zh ? cn : en), [zh]);

  const [expanded, setExpanded] = useState(true);
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);
  const [relatedKey, setRelatedKey] = useState<string | null>(null);
  const [relatedCache, setRelatedCache] = useState<Record<string, TimetableItem[]>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState(roundedTimeNow());
  const [subjectName, setSubjectName] = useState("Personal");
  const [activity, setActivity] = useState<ActivityType>("learn");
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    fetchUpcoming(7)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const visible = useMemo(() => (events ?? []).slice(0, VISIBLE_COUNT), [events]);
  const overflowCount = Math.max(0, (events?.length ?? 0) - VISIBLE_COUNT);

  const handleToggleDone = async (e: UpcomingEvent) => {
    setEvents((prev) => (prev ?? []).filter((ev) => ev.item.id !== e.item.id));
    try {
      await toggleItem(e.plan_id, e.day_date, e.item.id, true);
    } catch {
      // Leave it removed locally; a refresh will re-sync from the server.
    }
  };

  const toggleRelated = async (e: UpcomingEvent) => {
    const key = `${e.plan_id}:${e.item.id}`;
    if (relatedKey === key) {
      setRelatedKey(null);
      return;
    }
    setRelatedKey(key);
    if (relatedCache[key]) return;
    try {
      const plan = await fetchPlan(e.plan_id);
      const siblings = plan.days.flatMap((day) =>
        day.items
          .filter(
            (it) =>
              it.id !== e.item.id &&
              it.subject_id === e.item.subject_id &&
              it.chapter_name === e.item.chapter_name &&
              it.topic_name === e.item.topic_name,
          )
          .map((it) => ({ ...it, __date: day.date }) as TimetableItem & { __date: string }),
      );
      setRelatedCache((prev) => ({ ...prev, [key]: siblings }));
    } catch {
      setRelatedCache((prev) => ({ ...prev, [key]: [] }));
    }
  };

  const handleAddEvent = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const { plan_id, item } = await addQuickEvent({
        title,
        date,
        time,
        subject_name: subjectName,
        activity,
        minutes,
      });
      setEvents((prev) =>
        [...(prev ?? []), { plan_id, plan_name: tr("快速事件", "Quick Events"), day_date: date, item }].sort(
          (a, b) => a.day_date.localeCompare(b.day_date),
        ),
      );
      setTitle("");
      setShowAddForm(false);
    } catch {
      // Swallow — the form stays open so the user can retry.
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-2 mt-1 shrink-0 rounded-lg border border-[var(--border)]/60 bg-[var(--background)]/40">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-1.5 text-left text-[11.5px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
          aria-expanded={expanded}
        >
          <ChevronDown
            size={12}
            strokeWidth={2}
            className={`transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
          />
          <span>{tr("即将到来", "Upcoming")}</span>
          {events !== null && events.length > 0 && (
            <span className="rounded-full bg-[var(--primary)]/15 px-1.5 py-px text-[10px] font-medium text-[var(--primary)]">
              {events.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] cursor-pointer"
          aria-label={tr("快速添加事件", "Quick add event")}
        >
          <Plus size={13} strokeWidth={2} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden px-2"
          >
            <div className="mb-2 space-y-1.5 rounded-md bg-[var(--card)] p-2">
              <input
                value={title}
                onChange={(ev) => setTitle(ev.target.value)}
                placeholder={tr("事件标题", "Event title")}
                className="w-full rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11.5px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              />
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={date}
                  onChange={(ev) => setDate(ev.target.value)}
                  className="min-w-0 flex-1 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(ev) => setTime(ev.target.value)}
                  className="min-w-0 flex-1 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex gap-1.5">
                <select
                  value={activity}
                  onChange={(ev) => setActivity(ev.target.value as ActivityType)}
                  className="rounded border border-[var(--border)] bg-transparent px-1 py-1 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                >
                  <option value="learn">{tr("学习", "Learn")}</option>
                  <option value="practice">{tr("练习", "Practice")}</option>
                  <option value="revision">{tr("复习", "Revision")}</option>
                </select>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={subjectName}
                  onChange={(ev) => setSubjectName(ev.target.value)}
                  placeholder={tr("学科", "Subject")}
                  className="min-w-0 flex-1 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
                <input
                  type="number"
                  min={1}
                  value={minutes}
                  onChange={(ev) => setMinutes(Math.max(1, Number(ev.target.value)))}
                  className="w-14 rounded border border-[var(--border)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded px-2 py-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  {tr("取消", "Cancel")}
                </button>
                <button
                  type="button"
                  disabled={!title.trim() || saving}
                  onClick={handleAddEvent}
                  className="rounded bg-[var(--primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  {tr("添加", "Add")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 px-1.5 pb-1.5">
              {events === null ? (
                <div className="h-4 animate-pulse rounded bg-[var(--muted)]" />
              ) : visible.length === 0 ? (
                <p className="px-1.5 py-1 text-[11px] text-[var(--muted-foreground)]/70">
                  {tr("近期没有安排", "Nothing coming up")}
                </p>
              ) : (
                visible.map((e) => {
                  const Icon = ACTIVITY_ICON[e.item.activity];
                  const colors = colorForSubjectId(e.item.subject_id);
                  const key = `${e.plan_id}:${e.item.id}`;
                  const related = relatedCache[key];
                  const isRelatedOpen = relatedKey === key;
                  return (
                    <div key={key}>
                      <div className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--accent)]/60">
                        <button
                          type="button"
                          onClick={() => handleToggleDone(e)}
                          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] transition-colors hover:border-[var(--primary)] cursor-pointer"
                          aria-label={tr("标记完成", "Mark done")}
                        />
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                        <button
                          type="button"
                          onClick={() => toggleRelated(e)}
                          className="flex min-w-0 flex-1 items-center gap-1 text-left cursor-pointer"
                        >
                          <span className="truncate text-[11.5px] text-[var(--foreground)]">
                            {e.item.topic_name}
                          </span>
                          <Icon size={11} strokeWidth={1.8} className="shrink-0 text-[var(--muted-foreground)]" />
                        </button>
                        <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]">
                          {relativeDateLabel(e.day_date, tr)}
                        </span>
                      </div>

                      <AnimatePresence initial={false}>
                        {isRelatedOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden pl-6"
                          >
                            {related === undefined ? (
                              <div className="py-1 text-[10.5px] text-[var(--muted-foreground)]/60">
                                {tr("加载中…", "Loading…")}
                              </div>
                            ) : related.length === 0 ? (
                              <div className="flex items-center gap-1 py-1 text-[10.5px] text-[var(--muted-foreground)]/60">
                                <Link2 size={10} /> {tr("没有关联事件", "No related events")}
                              </div>
                            ) : (
                              related.map((sib) => {
                                const SibIcon = ACTIVITY_ICON[sib.activity];
                                const sibDate = (sib as TimetableItem & { __date?: string }).__date;
                                return (
                                  <div
                                    key={sib.id}
                                    className="flex items-center gap-1.5 py-0.5 text-[10.5px] text-[var(--muted-foreground)]"
                                  >
                                    <ChevronRight size={9} className="shrink-0 opacity-50" />
                                    <SibIcon size={10} strokeWidth={1.8} className="shrink-0" />
                                    <span className={sib.done ? "line-through opacity-60" : ""}>
                                      {sibDate ? relativeDateLabel(sibDate, tr) : ""}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
              {overflowCount > 0 && (
                <Link
                  href="/space/timetable"
                  className="block px-1.5 py-1 text-[10.5px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {tr(`还有 ${overflowCount} 项`, `+${overflowCount} more`)}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
