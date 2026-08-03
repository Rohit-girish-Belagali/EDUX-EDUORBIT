"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, X, ArrowRight, BookOpen } from "lucide-react";

import type { SyllabusSubject } from "@/lib/timetable-api";
import { subjectColor } from "./subjectColors";

const DIFFICULTY_LABEL: Record<number, { cn: string; en: string }> = {
  1: { cn: "简单", en: "Easy" },
  2: { cn: "一般", en: "Medium" },
  3: { cn: "困难", en: "Hard" },
};

function countTopics(subject: SyllabusSubject): number {
  return subject.chapters.reduce((n, c) => n + c.topics.length, 0);
}

export default function SyllabusReviewStep({
  tr,
  initialSubjects,
  onBack,
  onContinue,
}: {
  tr: (cn: string, en: string) => string;
  initialSubjects: SyllabusSubject[];
  onBack: () => void;
  onContinue: (subjects: SyllabusSubject[]) => void;
}) {
  const [subjects, setSubjects] = useState<SyllabusSubject[]>(initialSubjects);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(initialSubjects.map((s) => s.id)));

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const updateSubject = (id: string, patch: Partial<SyllabusSubject>) =>
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeChapter = (subjectId: string, chapterId: string) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subjectId ? { ...s, chapters: s.chapters.filter((c) => c.id !== chapterId) } : s,
      ),
    );

  const removeTopic = (subjectId: string, chapterId: string, topicId: string) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id !== subjectId
          ? s
          : {
              ...s,
              chapters: s.chapters.map((c) =>
                c.id !== chapterId ? c : { ...c, topics: c.topics.filter((t) => t.id !== topicId) },
              ),
            },
      ),
    );

  const setTopicDifficulty = (
    subjectId: string,
    chapterId: string,
    topicId: string,
    difficulty: number,
  ) =>
    setSubjects((prev) =>
      prev.map((s) =>
        s.id !== subjectId
          ? s
          : {
              ...s,
              chapters: s.chapters.map((c) =>
                c.id !== chapterId
                  ? c
                  : { ...c, topics: c.topics.map((t) => (t.id === topicId ? { ...t, difficulty } : t)) },
              ),
            },
      ),
    );

  const includedCount = subjects.filter((s) => s.include && s.chapters.length > 0).length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h2 className="text-[17px] font-semibold text-[var(--foreground)]">
        {tr("确认学科与章节", "Review subjects & chapters")}
      </h2>
      <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
        {tr(
          "勾选要纳入计划的学科，可移除不需要的章节或主题，并按需调整难度权重。",
          "Choose which subjects to include, drop any chapters or topics you don't need, and adjust difficulty if you like.",
        )}
      </p>

      <div className="mt-5 space-y-3">
        {subjects.map((subject, si) => {
          const colors = subjectColor(si);
          const isOpen = expanded.has(subject.id);
          const topicCount = countTopics(subject);
          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: si * 0.03 }}
              className={`rounded-xl border bg-[var(--card)] transition-opacity ${
                subject.include ? "border-[var(--border)]" : "border-[var(--border)] opacity-50"
              }`}
            >
              <div className="flex items-center gap-2.5 p-3">
                <input
                  type="checkbox"
                  checked={subject.include}
                  onChange={(e) => updateSubject(subject.id, { include: e.target.checked })}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
                />
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors.tile}`}>
                  <BookOpen size={14} strokeWidth={1.7} />
                </span>
                <input
                  value={subject.name}
                  onChange={(e) => updateSubject(subject.id, { name: e.target.value })}
                  className="min-w-0 flex-1 truncate bg-transparent text-[14px] font-medium text-[var(--foreground)] outline-none"
                />
                <span className="shrink-0 text-[11.5px] text-[var(--muted-foreground)]">
                  {topicCount} {tr("个主题", "topics")}
                </span>
                <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-[var(--muted)] p-0.5">
                  {[1, 2, 3].map((w) => (
                    <button
                      key={w}
                      onClick={() => updateSubject(subject.id, { weight: w })}
                      title={tr("优先级", "Priority")}
                      className={`h-6 w-6 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        subject.weight === w
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => toggleExpanded(subject.id)}
                  className="shrink-0 rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] cursor-pointer"
                >
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {isOpen && (
                <div className="space-y-2 border-t border-[var(--border)] p-3">
                  {subject.chapters.map((chapter) => (
                    <div key={chapter.id} className="rounded-lg bg-[var(--muted)]/50 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-medium text-[var(--foreground)]">
                          {chapter.name}
                        </span>
                        <button
                          onClick={() => removeChapter(subject.id, chapter.id)}
                          className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)]/60 hover:text-[var(--destructive)] cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {chapter.topics.map((topic) => (
                          <span
                            key={topic.id}
                            className="group flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] py-0.5 pl-2 pr-1 text-[11px] text-[var(--foreground)]"
                          >
                            {topic.name}
                            <select
                              value={topic.difficulty}
                              onChange={(e) =>
                                setTopicDifficulty(subject.id, chapter.id, topic.id, Number(e.target.value))
                              }
                              className="cursor-pointer rounded bg-transparent text-[10px] text-[var(--muted-foreground)] outline-none"
                            >
                              {[1, 2, 3].map((d) => (
                                <option key={d} value={d}>
                                  {tr(DIFFICULTY_LABEL[d].cn, DIFFICULTY_LABEL[d].en)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeTopic(subject.id, chapter.id, topic.id)}
                              className="rounded-full p-0.5 text-[var(--muted-foreground)]/50 opacity-0 hover:text-[var(--destructive)] group-hover:opacity-100 cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-md px-3 py-2 text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] cursor-pointer"
        >
          {tr("返回", "Back")}
        </button>
        <button
          disabled={includedCount === 0}
          onClick={() => onContinue(subjects)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          {tr("下一步", "Continue")}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
