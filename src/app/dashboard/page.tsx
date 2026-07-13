import { requireUser } from "@/lib/current-user";
import { getFocusItem, listCategories, listItemsForPeriod } from "@/lib/items";
import { shiftedPeriodStart, PERIOD_TYPES } from "@/lib/dates";
import type { PeriodType } from "@/lib/supabase/types";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

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
      <DashboardContent
        initialItems={items}
        initialFocusItem={focusItem}
        categories={categories}
        periodType={periodType}
        offset={offset}
        periodStart={periodStart}
        connected={Boolean(session.accessToken)}
      />
    </DashboardShell>
  );
}
