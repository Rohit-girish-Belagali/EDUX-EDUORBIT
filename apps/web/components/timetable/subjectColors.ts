// Fixed accent palette cycled by subject order, mirroring the tile-accent
// pattern used by SpaceDashboard's DashboardCard (explicit light/dark
// Tailwind classes rather than CSS vars, since we need N distinct hues).
const PALETTE = [
  { tile: "bg-sky-500/10 text-sky-600 dark:text-sky-400", dot: "bg-sky-500", border: "border-sky-500/30" },
  { tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-500/30" },
  { tile: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500", border: "border-amber-500/30" },
  { tile: "bg-violet-500/10 text-violet-600 dark:text-violet-400", dot: "bg-violet-500", border: "border-violet-500/30" },
  { tile: "bg-rose-500/10 text-rose-600 dark:text-rose-400", dot: "bg-rose-500", border: "border-rose-500/30" },
  { tile: "bg-teal-500/10 text-teal-600 dark:text-teal-400", dot: "bg-teal-500", border: "border-teal-500/30" },
  { tile: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", dot: "bg-indigo-500", border: "border-indigo-500/30" },
  { tile: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500", border: "border-orange-500/30" },
];

export function subjectColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
