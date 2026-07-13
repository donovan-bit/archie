import type { CategoryRow } from "@/lib/supabase/types";

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

export interface CategoryTreeNode {
  category: CategoryRow;
  children: CategoryRow[];
}

/** Groups a flat category list into top-level categories with their
 * subcategories nested underneath. Only two levels are supported -- a
 * subcategory whose own parent isn't top-level is treated as top-level
 * itself, since that shouldn't happen given how categories are created. */
export function buildCategoryTree(categories: CategoryRow[]): CategoryTreeNode[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const topLevel = categories.filter(
    (c) => !c.parent_id || !byId.has(c.parent_id),
  );
  return topLevel.map((category) => ({
    category,
    children: categories.filter((c) => c.parent_id === category.id),
  }));
}

/** Full "Parent > Child" label for a category, for AI prompts and select
 * option labels. Top-level categories just return their own name. */
export function categoryPath(category: CategoryRow, all: CategoryRow[]): string {
  if (!category.parent_id) return category.name;
  const parent = all.find((c) => c.id === category.parent_id);
  return parent ? `${parent.name} > ${category.name}` : category.name;
}
