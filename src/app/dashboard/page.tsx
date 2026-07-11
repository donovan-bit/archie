import { requireUser } from "@/lib/current-user";
import { getFocusItem, listCategories, listItemsForPeriod } from "@/lib/items";
import { listCalendarEvents } from "@/lib/google/calendar";
import { periodIsoRange, shiftedPeriodStart, PERIOD_TYPES } from "@/lib/dates";
import type { PeriodType } from "@/lib/supabase/types";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PeriodNav } from "@/components/dashboard/period-nav";
import { FocusBeacon } from "@/components/dashboard/focus-beacon";
import { ItemBoard } from "@/components/dashboard/item-board";
import { CalendarPanel } from "@/components/dashboard/calendar-panel";

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

  let events: Awaited<ReturnType<typeof listCalendarEvents>> = [];
  let calendarError: string | null = null;

  if (session.accessToken) {
    try {
      const { timeMin, timeMax } = periodIsoRange(periodType, periodStart);
      events = await listCalendarEvents(session.accessToken, timeMin, timeMax);
    } catch {
      calendarError = "Couldn't load Google Calendar events right now.";
    }
  }

  return (
    <DashboardShell userName={session.user?.name} userEmail={session.user?.email}>
      <PeriodNav periodType={periodType} offset={offset} periodStart={periodStart} />
      <FocusBeacon item={focusItem} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ItemBoard
          items={items}
          categories={categories}
          periodType={periodType}
          periodStart={periodStart}
        />
        <CalendarPanel
          events={events}
          error={calendarError}
          connected={Boolean(session.accessToken)}
        />
      </div>
    </DashboardShell>
  );
}
