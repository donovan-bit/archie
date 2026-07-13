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

/**
 * "Now," expressed as a Date whose local getters (getFullYear/getMonth/
 * getDate, which is what date-fns reads) return Brisbane's current
 * wall-clock fields -- regardless of what timezone the server process
 * itself is running in (Vercel's functions run in UTC). Without this,
 * server-side "today" lags behind Don's actual day for the first ~10
 * hours of it, since Brisbane (UTC+10, no DST) is that far ahead of UTC.
 */
export function nowInBrisbane(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
}

/** Applies `offset` whole periods (positive or negative) to `from` and
 * returns the resulting period's canonical start. Used for prev/next
 * navigation between periods. */
export function shiftedPeriodStart(
  periodType: PeriodType,
  offset: number,
  from: Date = nowInBrisbane(),
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
