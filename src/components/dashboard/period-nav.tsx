import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { PERIOD_TYPES, periodLabel } from "@/lib/dates";
import type { PeriodType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const PERIOD_TITLES: Record<PeriodType, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

function href(periodType: PeriodType, offset: number) {
  const params = new URLSearchParams({ period: periodType, offset: String(offset) });
  return `/dashboard?${params.toString()}`;
}

export function PeriodNav({
  periodType,
  offset,
  periodStart,
}: {
  periodType: PeriodType;
  offset: number;
  periodStart: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav className="inline-flex h-9 w-fit items-center gap-1 rounded-lg bg-muted p-1">
        {PERIOD_TYPES.map((type) => (
          <Link
            key={type}
            href={href(type, 0)}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-colors",
              type === periodType
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PERIOD_TITLES[type]}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon">
          <Link href={href(periodType, offset - 1)} aria-label="Previous period">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <div className="min-w-40 text-center text-sm font-medium">
          {periodLabel(periodType, periodStart)}
        </div>
        <Button asChild variant="outline" size="icon">
          <Link href={href(periodType, offset + 1)} aria-label="Next period">
            <ChevronRightIcon />
          </Link>
        </Button>
        {offset !== 0 && (
          <Button asChild variant="ghost" size="sm">
            <Link href={href(periodType, 0)}>Today</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
