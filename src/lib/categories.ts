export const CATEGORY_COLORS = [
  "slate",
  "blue",
  "green",
  "amber",
  "violet",
  "rose",
  "cyan",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

const DOT_CLASSES: Record<string, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

export function categoryDotClass(color: string): string {
  return DOT_CLASSES[color] ?? DOT_CLASSES.slate;
}
