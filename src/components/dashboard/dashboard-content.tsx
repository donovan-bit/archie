"use client";

import { useState } from "react";

import type { CategoryRow, ItemRow, PeriodType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { TodoWorkspace } from "@/components/dashboard/todo-workspace";
import { CalendarView, type CalendarViewMode } from "@/components/dashboard/calendar-view";

export function DashboardContent({
  initialItems,
  initialFocusItem,
  categories,
  periodType,
  offset,
  periodStart,
  connected,
}: {
  initialItems: ItemRow[];
  initialFocusItem: ItemRow | null;
  categories: CategoryRow[];
  periodType: PeriodType;
  offset: number;
  periodStart: string;
  connected: boolean;
}) {
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("day");
  // Week/month grids need the full row -- stack them instead of squeezing
  // into the narrow sidebar column, where a tall to-do list pushes the
  // calendar below the fold and it reads as having "disappeared".
  const calendarWide = calendarView !== "day";

  return (
    <div className={cn("grid gap-6", calendarWide ? "grid-cols-1" : "lg:grid-cols-[1fr_380px]")}>
      <div className={calendarWide ? "order-2" : undefined}>
        <TodoWorkspace
          initialItems={initialItems}
          initialFocusItem={initialFocusItem}
          categories={categories}
          periodType={periodType}
          offset={offset}
          periodStart={periodStart}
        />
      </div>
      <div className={calendarWide ? "order-1" : undefined}>
        <CalendarView
          connected={connected}
          initialDate={periodStart}
          view={calendarView}
          onViewChange={setCalendarView}
        />
      </div>
    </div>
  );
}
