"use client";

import { useEffect, useRef } from "react";
import { format, isSameDay, isToday } from "date-fns";

import type { CalendarEvent } from "@/lib/google/calendar";
import { getEventColor } from "@/lib/google/event-colors";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter(
    (e) => !e.allDay && e.start && e.end && isSameDay(new Date(e.start), day),
  );
}

function layoutDayEvents(events: CalendarEvent[]) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start!).getTime() - new Date(b.start!).getTime(),
  );
  const laneEnds: number[] = [];
  const laid = sorted.map((event) => {
    const start = new Date(event.start!).getTime();
    const end = new Date(event.end!).getTime();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    return { event, lane };
  });
  const laneCount = Math.max(laneEnds.length, 1);
  return laid.map(({ event, lane }) => ({ event, lane, laneCount }));
}

export function CalendarTimeGrid({
  days,
  events,
  onEventClick,
  onSlotClick,
}: {
  days: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (start: Date, end: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 7 * HOUR_HEIGHT - 24 });
  }, []);

  const allDayEvents = events.filter((e) => e.allDay);
  const gridTemplateColumns = `56px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {days.length > 1 && (
        <div className="grid border-b border-border" style={{ gridTemplateColumns }}>
          <div />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-l border-border px-2 py-1.5 text-center text-xs font-medium",
                isToday(day) && "text-[#1a73e8]",
              )}
            >
              {format(day, "EEE")}{" "}
              <span
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded-full",
                  isToday(day) && "bg-[#1a73e8] font-semibold text-white",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
          ))}
        </div>
      )}

      {allDayEvents.length > 0 && (
        <div className="grid border-b border-border" style={{ gridTemplateColumns }}>
          <div className="px-1 py-1 text-[10px] text-muted-foreground">All day</div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="flex flex-col gap-1 border-l border-border p-1"
            >
              {allDayEvents
                .filter((e) => e.start && isSameDay(new Date(e.start), day))
                .map((e) => {
                  const color = getEventColor(e.colorId);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => onEventClick(e)}
                      style={{ backgroundColor: color.bg, color: color.fg }}
                      className="truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium hover:opacity-90"
                    >
                      {e.title}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="max-h-[32rem] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns }}>
          <div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="relative border-t border-border/60 pr-1.5 text-right text-[10px] text-muted-foreground first:border-t-0"
              >
                <span className="absolute -top-2 right-1.5">
                  {hour === 0 ? "" : format(new Date(2000, 0, 1, hour), "h a")}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayEvents = layoutDayEvents(eventsForDay(events, day));
            const nowTop = isToday(day) ? minutesSinceMidnight(new Date()) : null;

            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-border"
              >
                {HOURS.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    style={{ height: HOUR_HEIGHT }}
                    className="block w-full border-t border-border/60 first:border-t-0 hover:bg-accent/40"
                    onClick={() => {
                      const start = new Date(day);
                      start.setHours(hour, 0, 0, 0);
                      const end = new Date(start);
                      end.setHours(hour + 1);
                      onSlotClick(start, end);
                    }}
                  />
                ))}

                {dayEvents.map(({ event, lane, laneCount }) => {
                  const start = new Date(event.start!);
                  const end = new Date(event.end!);
                  const top = (minutesSinceMidnight(start) / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    ((end.getTime() - start.getTime()) / 60000 / 60) * HOUR_HEIGHT,
                    18,
                  );
                  const widthPct = 100 / laneCount;
                  const color = getEventColor(event.colorId);

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      style={{
                        top,
                        height,
                        left: `${lane * widthPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: color.bg,
                        color: color.fg,
                      }}
                      className="absolute z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium shadow-sm hover:opacity-90"
                    >
                      <span className="block truncate">{event.title}</span>
                    </button>
                  );
                })}

                {nowTop !== null && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: (nowTop / 60) * HOUR_HEIGHT }}
                  >
                    <div className="-ml-1 size-2.5 rounded-full bg-[#ea4335]" />
                    <div className="h-0.5 flex-1 bg-[#ea4335]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
