import { ChevronDownIcon, ListTodoIcon } from "lucide-react";

import { requireUser } from "@/lib/current-user";
import { getFocusItem, listCategories, listItemsForPeriod } from "@/lib/items";
import { shiftedPeriodStart, PERIOD_TYPES } from "@/lib/dates";
import type { PeriodType } from "@/lib/supabase/types";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PeriodNav } from "@/components/dashboard/period-nav";
import { FocusBeacon } from "@/components/dashboard/focus-beacon";
import { ItemBoard } from "@/components/dashboard/item-board";
import { CalendarView } from "@/components/dashboard/calendar-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; offset?: string }>;
}) {
  const { session, dbUser } = await requireUser();
  const sp = await searchParams;

  const periodType: PeriodType = PERIOD_TYPES.includes(sp.period as PeriodType)
    ? (sp.period as PeriodType)
    : "day";
  const offset = Number.parseInt(sp.offset ?? "0", 10) || 0;
  const periodStart = shiftedPeriodStart(periodType, offset);

  const [items, categories, focusItem] = await Promise.all([
    listItemsForPeriod(dbUser.id, periodType, periodStart),
    listCategories(dbUser.id),
    getFocusItem(dbUser.id),
  ]);

  return (
    <DashboardShell userName={session.user?.name} userEmail={session.user?.email}>
      <FocusBeacon item={focusItem} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <details
          open
          className="group h-fit rounded-xl border border-border bg-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-5 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <ListTodoIcon className="size-4" /> To Do List
            </span>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-4 px-5 pb-5">
            <PeriodNav periodType={periodType} offset={offset} periodStart={periodStart} />
            <ItemBoard
              items={items}
              categories={categories}
              periodType={periodType}
              periodStart={periodStart}
            />
          </div>
        </details>

        <CalendarView connected={Boolean(session.accessToken)} initialDate={periodStart} />
      </div>
    </DashboardShell>
  );
}
