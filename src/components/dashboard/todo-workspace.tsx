"use client";

import { useOptimistic, useTransition } from "react";
import { ListTodoIcon } from "lucide-react";

import type { CategoryRow, ItemRow, ItemStatus, PeriodType } from "@/lib/supabase/types";
import {
  deleteItemAction,
  setFocusAction,
  setItemStatusAction,
} from "@/app/dashboard/actions";
import { FocusBeacon } from "@/components/dashboard/focus-beacon";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { PeriodNav } from "@/components/dashboard/period-nav";
import { ItemBoard } from "@/components/dashboard/item-board";

type ItemAction =
  | { type: "status"; id: string; status: ItemStatus }
  | { type: "focus"; id: string }
  | { type: "unfocus" }
  | { type: "delete"; id: string };

function itemsReducer(items: ItemRow[], action: ItemAction): ItemRow[] {
  switch (action.type) {
    case "status":
      return items.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: action.status,
              completed_at:
                action.status === "completed" ? new Date().toISOString() : null,
            }
          : item,
      );
    case "focus":
      return items.map((item) => ({ ...item, is_focus: item.id === action.id }));
    case "unfocus":
      return items.map((item) => ({ ...item, is_focus: false }));
    case "delete":
      return items.filter((item) => item.id !== action.id);
  }
}

export function TodoWorkspace({
  initialItems,
  initialFocusItem,
  categories,
  periodType,
  offset,
  periodStart,
}: {
  initialItems: ItemRow[];
  initialFocusItem: ItemRow | null;
  categories: CategoryRow[];
  periodType: PeriodType;
  offset: number;
  periodStart: string;
}) {
  const [items, dispatchItems] = useOptimistic(initialItems, itemsReducer);
  const [focusItem, setFocusItemOptimistic] = useOptimistic(initialFocusItem);
  const [, startTransition] = useTransition();

  function handleToggleComplete(id: string, status: ItemStatus) {
    startTransition(async () => {
      dispatchItems({ type: "status", id, status });
      await setItemStatusAction(id, status);
    });
  }

  function handleToggleFocus(item: ItemRow) {
    const willFocus = !item.is_focus;
    startTransition(async () => {
      dispatchItems(willFocus ? { type: "focus", id: item.id } : { type: "unfocus" });
      setFocusItemOptimistic(willFocus ? item : null);
      await setFocusAction(willFocus ? item.id : null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      dispatchItems({ type: "delete", id });
      await deleteItemAction(id);
    });
  }

  function handleClearFocus() {
    startTransition(async () => {
      dispatchItems({ type: "unfocus" });
      setFocusItemOptimistic(null);
      await setFocusAction(null);
    });
  }

  return (
    <>
      <FocusBeacon item={focusItem} onClear={handleClearFocus} className="lg:col-span-2" />
      <DashboardSection
        title="To Do List"
        icon={<ListTodoIcon className="size-4" />}
        defaultOpen
      >
        <PeriodNav periodType={periodType} offset={offset} periodStart={periodStart} />
        <ItemBoard
          items={items}
          categories={categories}
          periodType={periodType}
          periodStart={periodStart}
          onToggleComplete={handleToggleComplete}
          onToggleFocus={handleToggleFocus}
          onDelete={handleDelete}
        />
      </DashboardSection>
    </>
  );
}
