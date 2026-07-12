import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";

import type { PeriodType } from "@/lib/supabase/types";

const DATE_FMT = "yyyy-MM-dd";

export function toDateKey(date: Date): string {
  return format(date, DATE_FMT);
}

/** The canonical period_start value for the period containing `date`. */
export function periodStartFor(periodType: PeriodType, date: Date): string {
  switch (periodType) {
    case "day":
      return toDateKey(date);
    case "week":
      return toDateKey(startOfWeek(date, { weekStartsOn: 1 }));
    case "month":
      return toDateKey(startOfMonth(date));
    case "quarter":
      return toDateKey(startOfQuarter(date));
    case "year":
      return toDateKey(startOfYear(date));
  }
}

/** The last day belonging to the period that starts on `periodStart`. */
export function periodEndFor(periodType: PeriodType, periodStart: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  switch (periodType) {
    case "day":
      return periodStart;
    case "week":
      return toDateKey(endOfWeek(start, { weekStartsOn: 1 }));
    case "month":
      return toDateKey(endOfMonth(start));
    case "quarter":
      return toDateKey(endOfQuarter(start));
    case "year":
      return toDateKey(endOfYear(start));
  }
}

/** The period_start of the period immediately following `periodStart`. */
export function nextPeriodStart(periodType: PeriodType, periodStart: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  switch (periodType) {
    case "day":
      return toDateKey(addDays(start, 1));
    case "week":
      return toDateKey(addWeeks(start, 1));
    case "month":
      return toDateKey(addMonths(start, 1));
    case "quarter":
      return toDateKey(addQuarters(start, 1));
    case "year":
      return toDateKey(addYears(start, 1));
  }
}

export function periodLabel(periodType: PeriodType, periodStart: string): string {
  const start = new Date(`${periodStart}T00:00:00`);
  switch (periodType) {
    case "day":
      return format(start, "EEEE d MMMM");
    case "week":
      return `Week of ${format(start, "d MMM")}`;
    case "month":
      return format(start, "MMMM yyyy");
    case "quarter":
      return `Q${Math.floor(start.getMonth() / 3) + 1} ${format(start, "yyyy")}`;
    case "year":
      return format(start, "yyyy");
  }
}

export const PERIOD_TYPES: PeriodType[] = ["day", "week", "month", "quarter", "year"];

/** Applies `offset` whole periods (positive or negative) to `from` and
 * returns the resulting period's canonical start. Used for prev/next
 * navigation between periods. */
export function shiftedPeriodStart(
  periodType: PeriodType,
  offset: number,
  from: Date = new Date(),
): string {
  let shifted: Date;
  switch (periodType) {
    case "day":
      shifted = addDays(from, offset);
      break;
    case "week":
      shifted = addWeeks(from, offset);
      break;
    case "month":
      shifted = addMonths(from, offset);
      break;
    case "quarter":
      shifted = addQuarters(from, offset);
      break;
    case "year":
      shifted = addYears(from, offset);
      break;
  }
  return periodStartFor(periodType, shifted);
}
