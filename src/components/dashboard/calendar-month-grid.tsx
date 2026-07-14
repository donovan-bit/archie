"use client";

import { useState } from "react";
import { eachDayOfInterval, format, isSameDay, isSameMonth, isToday } from "date-fns";

import type { CalendarEvent } from "@/lib/google/calendar";
import { getEventColor } from "@/lib/google/event-colors";
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
  onEventDrop,
  placingDuplicate = false,
  onPlaceDuplicate,
}: {
  monthDate: Date;
  start: Date;
  end: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date) => void;
  placingDuplicate?: boolean;
  onPlaceDuplicate?: (day: Date) => void;
}) {
  const days = eachDayOfInterval({ start, end: new Date(end.getTime() - 1) });
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
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

          const dayKey = day.toISOString();

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => {
                if (placingDuplicate) {
                  onPlaceDuplicate?.(day);
                } else {
                  onSelectDay(day);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragEnter={() => setDragOverDay(dayKey)}
              onDragLeave={() =>
                setDragOverDay((current) => (current === dayKey ? null : current))
              }
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDay(null);
                const id = e.dataTransfer.getData("text/plain");
                const dropped = events.find((ev) => ev.id === id);
                if (!dropped || !dropped.start) return;
                const original = new Date(dropped.start);
                const newStart = new Date(day);
                newStart.setHours(original.getHours(), original.getMinutes(), 0, 0);
                onEventDrop(dropped, newStart);
              }}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-b border-l border-border p-1.5 text-left align-top first:border-l-0 [&:nth-child(7n+1)]:border-l-0 hover:bg-accent/40",
                !isSameMonth(day, monthDate) && "bg-muted/40 text-muted-foreground",
                dragOverDay === dayKey && "bg-accent",
                placingDuplicate && "cursor-copy hover:bg-[#1a73e8]/10",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-[#1a73e8] font-semibold text-white",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((event) => {
                  const color = getEventColor(event.colorId);
                  return (
                    <span
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      draggable={!event.allDay}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("text/plain", event.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(event.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
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
                      style={{ backgroundColor: color.bg, color: color.fg }}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] font-medium hover:opacity-90",
                        !event.allDay && "cursor-grab active:cursor-grabbing",
                        draggingId === event.id && "opacity-40",
                      )}
                    >
                      {event.title}
                    </span>
                  );
                })}
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
