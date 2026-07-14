"use client";

import { useEffect, useRef, useState } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { CopyIcon } from "lucide-react";

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
  onEventDrop,
  onEventResize,
  onEventDuplicate,
  placingDuplicate = false,
}: {
  days: Date[];
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (start: Date, end: Date) => void;
  onEventDrop: (event: CalendarEvent, newStart: Date) => void;
  onEventResize: (event: CalendarEvent, newEnd: Date) => void;
  onEventDuplicate: (event: CalendarEvent) => void;
  placingDuplicate?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<{ id: string; end: Date } | null>(null);
  const resizeRef = useRef<{
    event: CalendarEvent;
    day: Date;
    startClientY: number;
    originStart: Date;
    originEnd: Date;
  } | null>(null);
  const dragMoveRef = useRef<{
    event: CalendarEvent;
    startClientX: number;
    startClientY: number;
    moved: boolean;
    targetDay: string | null;
    targetHour: number | null;
  } | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 7 * HOUR_HEIGHT - 24 });
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const r = resizeRef.current;
      if (!r) return;
      const deltaMinutes = ((e.clientY - r.startClientY) / HOUR_HEIGHT) * 60;
      const snapped = Math.round(deltaMinutes / 15) * 15;
      let newEnd = new Date(r.originEnd.getTime() + snapped * 60000);
      const minEnd = new Date(r.originStart.getTime() + 15 * 60000);
      if (newEnd < minEnd) newEnd = minEnd;
      const dayEnd = new Date(r.day);
      dayEnd.setHours(23, 59, 0, 0);
      if (newEnd > dayEnd) newEnd = dayEnd;
      setResizePreview({ id: r.event.id, end: newEnd });
    }
    function onMouseUp() {
      const r = resizeRef.current;
      if (!r) return;
      resizeRef.current = null;
      setResizePreview((preview) => {
        const finalEnd = preview && preview.id === r.event.id ? preview.end : r.originEnd;
        onEventResize(r.event, finalEnd);
        return null;
      });
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onEventResize]);

  // Native HTML5 drag-and-drop is unreliable for this kind of dense,
  // overlapping-element grid (small drags get misread as clicks, drops on
  // top of other event blocks silently fail). Track the pointer manually
  // instead, the same way resizing already does.
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const r = dragMoveRef.current;
      if (!r) return;
      const dx = e.clientX - r.startClientX;
      const dy = e.clientY - r.startClientY;
      if (!r.moved && Math.hypot(dx, dy) > 4) {
        r.moved = true;
        setDraggingId(r.event.id);
      }
      if (!r.moved) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el instanceof Element ? el.closest("[data-hour]") : null;
      if (cell) {
        const cellDay = cell.getAttribute("data-day");
        const cellHour = Number(cell.getAttribute("data-hour"));
        r.targetDay = cellDay;
        r.targetHour = cellHour;
        setDragOverSlot(`${cellDay}-${cellHour}`);
      }
    }
    function onMouseUp() {
      const r = dragMoveRef.current;
      dragMoveRef.current = null;
      setDraggingId(null);
      setDragOverSlot(null);
      if (!r || !r.moved || !r.targetDay || r.targetHour === null || !r.event.start) return;
      const original = new Date(r.event.start);
      const newStart = new Date(r.targetDay);
      newStart.setHours(r.targetHour, original.getMinutes(), 0, 0);
      onEventDrop(r.event, newStart);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onEventDrop]);

  const allDayEvents = events.filter((e) => e.allDay);
  const gridTemplateColumns = `56px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        (resizePreview || draggingId) && "select-none",
      )}
    >
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
                {HOURS.map((hour) => {
                  const slotKey = `${day.toISOString()}-${hour}`;
                  return (
                    <button
                      key={hour}
                      type="button"
                      data-day={day.toISOString()}
                      data-hour={hour}
                      style={{ height: HOUR_HEIGHT }}
                      className={cn(
                        "block w-full border-t border-border/60 first:border-t-0 hover:bg-accent/40",
                        dragOverSlot === slotKey && "bg-accent",
                        placingDuplicate && "cursor-copy hover:bg-[#1a73e8]/10",
                      )}
                      onClick={() => {
                        const start = new Date(day);
                        start.setHours(hour, 0, 0, 0);
                        const end = new Date(start);
                        end.setHours(hour + 1);
                        onSlotClick(start, end);
                      }}
                    />
                  );
                })}

                {dayEvents.map(({ event, lane, laneCount }) => {
                  const start = new Date(event.start!);
                  const isResizingThis = resizePreview?.id === event.id;
                  const end = isResizingThis ? resizePreview!.end : new Date(event.end!);
                  const top = (minutesSinceMidnight(start) / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    ((end.getTime() - start.getTime()) / 60000 / 60) * HOUR_HEIGHT,
                    18,
                  );
                  const widthPct = 100 / laneCount;
                  const color = getEventColor(event.colorId);

                  return (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => {
                        if (event.allDay) return;
                        dragMoveRef.current = {
                          event,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          moved: false,
                          targetDay: null,
                          targetHour: null,
                        };
                      }}
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
                      style={{
                        top,
                        height,
                        left: `${lane * widthPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: color.bg,
                        color: color.fg,
                      }}
                      className={cn(
                        "group absolute z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium shadow-sm hover:opacity-90",
                        !event.allDay && "cursor-grab active:cursor-grabbing",
                        draggingId === event.id && "opacity-40",
                        draggingId !== null && "pointer-events-none",
                        isResizingThis && "opacity-90 ring-2 ring-white/70",
                      )}
                    >
                      <span className="block truncate pr-4">{event.title}</span>
                      <button
                        type="button"
                        aria-label="Duplicate event"
                        title="Duplicate"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventDuplicate(event);
                        }}
                        style={{ color: color.fg }}
                        className="absolute right-0.5 top-0.5 hidden rounded p-0.5 hover:bg-black/15 group-hover:block"
                      >
                        <CopyIcon className="size-3" />
                      </button>
                      {!event.allDay && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            resizeRef.current = {
                              event,
                              day,
                              startClientY: e.clientY,
                              originStart: start,
                              originEnd: new Date(event.end!),
                            };
                            setResizePreview({ id: event.id, end: new Date(event.end!) });
                          }}
                          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize group-hover:bg-black/20"
                        />
                      )}
                    </div>
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
