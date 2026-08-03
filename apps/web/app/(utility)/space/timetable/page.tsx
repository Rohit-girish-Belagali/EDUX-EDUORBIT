"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  fetchPlan,
  generatePlan,
  type SyllabusSubject,
  type TimetableConstraints,
  type TimetablePlan,
} from "@/lib/timetable-api";
import TimetableList from "@/components/timetable/TimetableList";
import SyllabusUploadStep from "@/components/timetable/SyllabusUploadStep";
import SyllabusReviewStep from "@/components/timetable/SyllabusReviewStep";
import AvailabilityStep from "@/components/timetable/AvailabilityStep";
import TimetableGeneratingAnimation from "@/components/timetable/TimetableGeneratingAnimation";
import TimetableResult from "@/components/timetable/TimetableResult";

/**
 * Timetable Planner — a wizard (upload -> review -> availability -> generate)
 * followed by the animated calendar result. Mirrors the Mastery Path
 * dashboard's local `tr(cn, en)` helper for bilingual strings rather than the
 * global app.json i18n path, matching this sibling `/space` section.
 */

type Step =
  | { name: "list" }
  | { name: "upload" }
  | { name: "review"; subjects: SyllabusSubject[] }
  | { name: "availability"; subjects: SyllabusSubject[] }
  | { name: "generating" }
  | { name: "result"; plan: TimetablePlan };

export default function TimetablePlannerPage() {
  const { i18n } = useTranslation();
  const zh = i18n.language?.toLowerCase().startsWith("zh");
  const tr = useCallback((cn: string, en: string) => (zh ? cn : en), [zh]);

  const [step, setStep] = useState<Step>({ name: "list" });
  const [error, setError] = useState<string | null>(null);

  const handleOpenPlan = useCallback(async (planId: string) => {
    try {
      const plan = await fetchPlan(planId);
      setStep({ name: "result", plan });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleGenerate = useCallback(
    async (name: string, subjects: SyllabusSubject[], constraints: TimetableConstraints) => {
      setStep({ name: "generating" });
      setError(null);
      try {
        const plan = await generatePlan(
          name,
          subjects.map((s) => ({
            name: s.name,
            include: s.include,
            weight: s.weight,
            chapters: s.chapters.map((c) => ({
              name: c.name,
              topics: c.topics.map((t) => ({ name: t.name, difficulty: t.difficulty })),
            })),
          })),
          constraints,
        );
        setStep({ name: "result", plan });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStep({ name: "availability", subjects });
      }
    },
    [],
  );

  return (
    <div className="h-full overflow-y-auto bg-[var(--background)] [scrollbar-gutter:stable]">
      {error && (
        <div className="mx-auto mt-4 max-w-4xl px-6">
          <div className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3 text-[12.5px] text-[var(--destructive)]">
            {error}
          </div>
        </div>
      )}

      {step.name === "list" && (
        <TimetableList
          tr={tr}
          onCreate={() => setStep({ name: "upload" })}
          onOpen={handleOpenPlan}
        />
      )}

      {step.name === "upload" && (
        <SyllabusUploadStep
          tr={tr}
          onExtracted={(subjects) => setStep({ name: "review", subjects })}
        />
      )}

      {step.name === "review" && (
        <SyllabusReviewStep
          tr={tr}
          initialSubjects={step.subjects}
          onBack={() => setStep({ name: "upload" })}
          onContinue={(subjects) => setStep({ name: "availability", subjects })}
        />
      )}

      {step.name === "availability" && (
        <AvailabilityStep
          tr={tr}
          defaultName={step.subjects
            .filter((s) => s.include)
            .map((s) => s.name)
            .join(" · ")}
          onBack={() => setStep({ name: "review", subjects: step.subjects })}
          onContinue={(name, constraints) => handleGenerate(name, step.subjects, constraints)}
        />
      )}

      {step.name === "generating" && (
        <TimetableGeneratingAnimation
          messages={[
            tr("正在分配学习时间…", "Allocating study time…"),
            tr("正在安排练习与复习…", "Scheduling practice and revision…"),
            tr("即将完成…", "Almost there…"),
          ]}
        />
      )}

      {step.name === "result" && (
        <TimetableResult
          tr={tr}
          initialPlan={step.plan}
          onBack={() => setStep({ name: "list" })}
        />
      )}
    </div>
  );
}
