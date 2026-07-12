"use client";

import { eachDayOfInterval, format, isSameDay, isSameMonth, isToday } from "date-fns";

import type { CalendarEvent } from "@/lib/google/calendar";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE = 3;

export function CalendarMonthGrid({
  monthDate,
  start,
  end,
  events,
  onSelectDay,
  onEventClick,
}: {
  monthDate: Date;
  start: Date;
  end: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const days = eachDayOfInterval({ start, end: new Date(end.getTime() - 1) });

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events
            .filter((e) => e.start && isSameDay(new Date(e.start), day))
            .sort(
              (a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime(),
            );
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const overflow = dayEvents.length - visible.length;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-b border-l border-border p-1.5 text-left align-top first:border-l-0 [&:nth-child(7n+1)]:border-l-0 hover:bg-accent/40",
                !isSameMonth(day, monthDate) && "bg-muted/40 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-focus font-semibold text-focus-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((event) => (
                  <span
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onEventClick(event);
                      }
                    }}
                    className="truncate rounded bg-primary/15 px-1 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/25"
                  >
                    {event.title}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
