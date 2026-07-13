"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import type { CategoryRow, ItemRow, ItemStatus, PeriodType } from "@/lib/supabase/types";
import { buildCategoryTree, categoryDotClass } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ItemRowView } from "@/components/dashboard/item-row";
import { NewItemDialog } from "@/components/dashboard/new-item-dialog";
import { ImportListDialog } from "@/components/dashboard/import-list-dialog";
import { CategoryFormDialog } from "@/components/dashboard/category-form-dialog";

interface ItemActions {
  onToggleComplete: (id: string, checked: boolean) => void;
  onToggleFocus: (item: ItemRow) => void;
  onDelete: (id: string) => void;
}

function ItemList({
  items,
  categories,
  actions,
}: {
  items: ItemRow[];
  categories: CategoryRow[];
  actions: ItemActions;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }
  // Completed items sink to the bottom; otherwise keep original order.
  const sorted = [...items].sort(
    (a, b) => Number(a.status === "completed") - Number(b.status === "completed"),
  );
  return (
    <div className="flex flex-col divide-y divide-border">
      {sorted.map((item) => (
        <ItemRowView
          key={item.id}
          item={item}
          categories={categories}
          onToggleComplete={(checked) => actions.onToggleComplete(item.id, checked)}
          onToggleFocus={() => actions.onToggleFocus(item)}
          onDelete={() => actions.onDelete(item.id)}
        />
      ))}
    </div>
  );
}

function SubcategorySection({
  name,
  items,
  actions,
  periodType,
  periodStart,
  categories,
  categoryId,
}: {
  name: string;
  items: ItemRow[];
  actions: ItemActions;
  periodType: PeriodType;
  periodStart: string;
  categories: CategoryRow[];
  categoryId: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-l-2 border-border pl-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronDownIcon
            className={cn("size-3.5 transition-transform", !collapsed && "rotate-180")}
          />
          {name}
          <span className="font-normal">
            {items.filter((i) => i.status === "completed").length}/{items.length}
          </span>
        </button>
        <NewItemDialog
          periodType={periodType}
          periodStart={periodStart}
          categories={categories}
          defaultCategoryId={categoryId}
          trigger={
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Add
            </button>
          }
        />
      </div>
      {!collapsed && <ItemList items={items} categories={categories} actions={actions} />}
    </div>
  );
}

export function ItemBoard({
  items,
  categories,
  periodType,
  periodStart,
  onToggleComplete,
  onToggleFocus,
  onDelete,
}: {
  items: ItemRow[];
  categories: CategoryRow[];
  periodType: PeriodType;
  periodStart: string;
  onToggleComplete: (id: string, status: ItemStatus) => void;
  onToggleFocus: (item: ItemRow) => void;
  onDelete: (id: string) => void;
}) {
  const tree = buildCategoryTree(categories);
  const uncategorized = items.filter((item) => !item.category_id);
  const actions: ItemActions = {
    onToggleComplete: (id, checked) =>
      onToggleComplete(id, checked ? "completed" : "pending"),
    onToggleFocus,
    onDelete,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <CategoryFormDialog />
        <ImportListDialog periodType={periodType} periodStart={periodStart} />
      </div>

      {tree.map(({ category, children }) => {
        const directItems = items.filter((item) => item.category_id === category.id);
        // Subcategories only show once they actually have something in
        // them for this period -- created on demand (manually or by the
        // AI import), not pre-populated as empty placeholders.
        const visibleChildren = children.filter((sub) =>
          items.some((item) => item.category_id === sub.id),
        );
        const allCategoryItems = items.filter(
          (item) =>
            item.category_id === category.id ||
            children.some((sub) => sub.id === item.category_id),
        );

        return (
          <Card key={category.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${categoryDotClass(category.color)}`} />
                <h2 className="text-sm font-semibold">{category.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {allCategoryItems.filter((i) => i.status === "completed").length}/
                  {allCategoryItems.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CategoryFormDialog
                  parentId={category.id}
                  parentName={category.name}
                  defaultColor={category.color}
                  trigger={
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      + Subcategory
                    </button>
                  }
                />
                <NewItemDialog
                  periodType={periodType}
                  periodStart={periodStart}
                  categories={categories}
                  defaultCategoryId={category.id}
                />
              </div>
            </div>

            <ItemList items={directItems} categories={categories} actions={actions} />

            {visibleChildren.map((sub) => (
              <SubcategorySection
                key={sub.id}
                name={sub.name}
                items={items.filter((item) => item.category_id === sub.id)}
                actions={actions}
                periodType={periodType}
                periodStart={periodStart}
                categories={categories}
                categoryId={sub.id}
              />
            ))}
          </Card>
        );
      })}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Uncategorized
          </h2>
          <NewItemDialog
            periodType={periodType}
            periodStart={periodStart}
            categories={categories}
          />
        </div>
        <ItemList items={uncategorized} categories={categories} actions={actions} />
      </Card>
    </div>
  );
}
