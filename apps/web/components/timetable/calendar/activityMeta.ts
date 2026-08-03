import { BookOpen, PencilLine, RotateCcw } from "lucide-react";
import type { ActivityType } from "@/lib/timetable-api";

export const ACTIVITY_ICON: Record<ActivityType, typeof BookOpen> = {
  learn: BookOpen,
  practice: PencilLine,
  revision: RotateCcw,
};

export const ACTIVITY_LABEL: Record<ActivityType, { cn: string; en: string }> = {
  learn: { cn: "学习", en: "Learn" },
  practice: { cn: "练习", en: "Practice" },
  revision: { cn: "复习", en: "Revision" },
};

export const WEEKDAY_LABEL: { cn: string; en: string }[] = [
  { cn: "一", en: "Mon" },
  { cn: "二", en: "Tue" },
  { cn: "三", en: "Wed" },
  { cn: "四", en: "Thu" },
  { cn: "五", en: "Fri" },
  { cn: "六", en: "Sat" },
  { cn: "日", en: "Sun" },
];
