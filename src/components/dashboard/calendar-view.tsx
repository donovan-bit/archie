"use client";

import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-react";

import type { CalendarEvent } from "@/lib/google/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/components/dashboard/event-form-dialog";
import { CalendarTimeGrid } from "@/components/dashboard/calendar-time-grid";
import { CalendarMonthGrid } from "@/components/dashboard/calendar-month-grid";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
} from "@/app/dashboard/actions";

export type CalendarViewMode = "day" | "week" | "month";
type ViewMode = CalendarViewMode;

type EventAction =
  | { type: "patch"; id: string; start?: string; end?: string }
  | { type: "add"; event: CalendarEvent };

function eventsReducer(state: CalendarEvent[], action: EventAction): CalendarEvent[] {
  switch (action.type) {
    case "patch":
      return state.map((e) =>
        e.id === action.id
          ? {
              ...e,
              ...(action.start !== undefined ? { start: action.start } : {}),
              ...(action.end !== undefined ? { end: action.end } : {}),
            }
          : e,
      );
    case "add":
      return [...state, action.event];
  }
}

function rangeFor(view: ViewMode, date: Date) {
  if (view === "day") {
    const start = startOfDay(date);
    return { start, end: addDays(start, 1) };
  }
  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return { start, end: addDays(start, 7) };
  }
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = addDays(startOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 7);
  return { start, end };
}

export function CalendarView({
  connected,
  initialDate,
  view,
  onViewChange,
}: {
  connected: boolean;
  initialDate: string;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date(`${initialDate}T00:00:00`));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; start: Date; end: Date }
    | { mode: "edit"; event: CalendarEvent }
    | null
  >(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<CalendarEvent | null>(null);
  const [optimisticEvents, dispatchEvents] = useOptimistic(events, eventsReducer);
  const [, startTransition] = useTransition();

  const { start, end } = useMemo(() => rangeFor(view, currentDate), [view, currentDate]);

  const fetchEvents = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
      });
      const res = await fetch(`/api/calendar/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setError("Couldn't load Google Calendar events right now.");
    } finally {
      setLoading(false);
    }
  }, [connected, start, end]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchEvents, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchEvents]);

  const handleEventDrop = useCallback(
    (event: CalendarEvent, newStart: Date) => {
      if (!event.start || !event.end || event.allDay) return;
      const duration = new Date(event.end).getTime() - new Date(event.start).getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      const startIso = newStart.toISOString();
      const endIso = newEnd.toISOString();
      startTransition(async () => {
        dispatchEvents({ type: "patch", id: event.id, start: startIso, end: endIso });
        await updateCalendarEventAction(event.id, { startIso, endIso });
        fetchEvents();
      });
    },
    [fetchEvents, dispatchEvents],
  );

  const handleEventResize = useCallback(
    (event: CalendarEvent, newEnd: Date) => {
      if (!event.start || !event.end || event.allDay) return;
      const endIso = newEnd.toISOString();
      startTransition(async () => {
        dispatchEvents({ type: "patch", id: event.id, end: endIso });
        await updateCalendarEventAction(event.id, { endIso });
        fetchEvents();
      });
    },
    [fetchEvents, dispatchEvents],
  );

  const startDuplicate = useCallback((event: CalendarEvent) => {
    if (!event.start || !event.end || event.allDay) return;
    setPendingDuplicate(event);
  }, []);

  const cancelDuplicate = useCallback(() => setPendingDuplicate(null), []);

  const placeDuplicate = useCallback(
    (newStart: Date) => {
      const source = pendingDuplicate;
      if (!source || !source.start || !source.end) return;
      const duration = new Date(source.end).getTime() - new Date(source.start).getTime();
      const newEnd = new Date(newStart.getTime() + duration);
      const startIso = newStart.toISOString();
      const endIso = newEnd.toISOString();
      setPendingDuplicate(null);
      startTransition(async () => {
        dispatchEvents({
          type: "add",
          event: {
            id: `temp-${crypto.randomUUID()}`,
            title: source.title,
            start: startIso,
            end: endIso,
            allDay: false,
            htmlLink: null,
            colorId: source.colorId,
          },
        });
        await createCalendarEventAction({
          title: source.title,
          startIso,
          endIso,
          colorId: source.colorId,
        });
        fetchEvents();
      });
    },
    [pendingDuplicate, fetchEvents, dispatchEvents],
  );

  useEffect(() => {
    if (!pendingDuplicate) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPendingDuplicate(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDuplicate]);

  function goPrev() {
    setCurrentDate((d) =>
      view === "day" ? addDays(d, -1) : view === "week" ? addWeeks(d, -1) : addMonths(d, -1),
    );
  }
  function goNext() {
    setCurrentDate((d) =>
      view === "day" ? addDays(d, 1) : view === "week" ? addWeeks(d, 1) : addMonths(d, 1),
    );
  }
  function goToday() {
    setCurrentDate(new Date());
  }

  const label =
    view === "day"
      ? format(currentDate, "EEEE d MMMM yyyy")
      : view === "week"
        ? `${format(start, "d MMM")} – ${format(addDays(end, -1), "d MMM yyyy")}`
        : format(currentDate, "MMMM yyyy");

  return (
    <DashboardSection
      title="Calendar"
      icon={<CalendarIcon className="size-4" />}
      defaultOpen
    >
      {!connected && (
        <p className="text-sm text-muted-foreground">
          Calendar access isn&apos;t available for this session. Try
          signing out and back in to re-grant access.
        </p>
      )}

      {connected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToday} className="rounded-full">
                Today
              </Button>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goPrev}
                  aria-label="Previous"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goNext}
                  aria-label="Next"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              <span className="ml-1 text-base font-normal text-foreground">{label}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 items-center rounded-full border border-border p-0.5">
                {(["day", "week", "month"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onViewChange(v)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                      v === view
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-[#1a73e8] text-white hover:bg-[#1a73e8] hover:opacity-90"
                onClick={() => {
                  const s = new Date();
                  s.setMinutes(0, 0, 0);
                  s.setHours(s.getHours() + 1);
                  const e = new Date(s);
                  e.setHours(e.getHours() + 1);
                  setDialogState({ mode: "create", start: s, end: e });
                }}
              >
                <PlusIcon /> Create
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {loading && !error && (
            <p className="text-xs text-muted-foreground">Loading…</p>
          )}

          {pendingDuplicate && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-[#1a73e8]/30 bg-[#1a73e8]/10 px-3 py-2 text-sm text-[#1a73e8]">
              <span>
                Click where you&apos;d like to place the duplicate of &ldquo;
                {pendingDuplicate.title}&rdquo;
              </span>
              <button
                type="button"
                onClick={cancelDuplicate}
                aria-label="Cancel duplicate"
                className="rounded p-0.5 hover:bg-[#1a73e8]/15"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}

          {view === "month" ? (
            <CalendarMonthGrid
              monthDate={currentDate}
              start={start}
              end={end}
              events={optimisticEvents}
              onSelectDay={(day) => {
                setCurrentDate(day);
                onViewChange("day");
              }}
              onEventClick={(event) => setDialogState({ mode: "edit", event })}
              onEventDrop={handleEventDrop}
              placingDuplicate={pendingDuplicate !== null}
              onPlaceDuplicate={(day) => {
                if (!pendingDuplicate?.start) return;
                const original = new Date(pendingDuplicate.start);
                const newStart = new Date(day);
                newStart.setHours(original.getHours(), original.getMinutes(), 0, 0);
                placeDuplicate(newStart);
              }}
            />
          ) : (
            <CalendarTimeGrid
              days={
                view === "day"
                  ? [currentDate]
                  : Array.from({ length: 7 }, (_, i) => addDays(start, i))
              }
              events={optimisticEvents}
              onEventClick={(event) => setDialogState({ mode: "edit", event })}
              onSlotClick={(slotStart, slotEnd) => {
                if (pendingDuplicate) {
                  placeDuplicate(slotStart);
                } else {
                  setDialogState({ mode: "create", start: slotStart, end: slotEnd });
                }
              }}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onEventDuplicate={startDuplicate}
              placingDuplicate={pendingDuplicate !== null}
            />
          )}
        </>
      )}

      <EventFormDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        event={dialogState?.mode === "edit" ? dialogState.event : undefined}
        initialStart={dialogState?.mode === "create" ? dialogState.start : undefined}
        initialEnd={dialogState?.mode === "create" ? dialogState.end : undefined}
        onSaved={fetchEvents}
        onDuplicate={startDuplicate}
      />
    </DashboardSection>
  );
}
