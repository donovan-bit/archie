"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";

import type { CalendarEvent } from "@/lib/google/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/components/dashboard/event-form-dialog";
import { CalendarTimeGrid } from "@/components/dashboard/calendar-time-grid";
import { CalendarMonthGrid } from "@/components/dashboard/calendar-month-grid";

type ViewMode = "day" | "week" | "month";

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
}: {
  connected: boolean;
  initialDate: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(() => new Date(`${initialDate}T00:00:00`));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; start: Date; end: Date }
    | { mode: "edit"; event: CalendarEvent }
    | null
  >(null);

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
    if (collapsed) return;
    const timeoutId = setTimeout(fetchEvents, 0);
    return () => clearTimeout(timeoutId);
  }, [collapsed, fetchEvents]);

  const refetch = fetchEvents;

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

  const expanded = !collapsed && view !== "day";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card p-5",
        expanded && "lg:col-span-2",
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <CalendarIcon className="size-4" /> Calendar
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            !collapsed && "rotate-180",
          )}
        />
      </button>

      {!collapsed && (
        <>
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
                  <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous">
                    <ChevronLeftIcon />
                  </Button>
                  <Button variant="outline" size="icon" onClick={goNext} aria-label="Next">
                    <ChevronRightIcon />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={goToday}>
                    Today
                  </Button>
                  <span className="ml-1 text-sm font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 items-center rounded-lg bg-muted p-1">
                    {(["day", "week", "month"] as ViewMode[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setView(v)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                          v === view
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const s = new Date();
                      s.setMinutes(0, 0, 0);
                      s.setHours(s.getHours() + 1);
                      const e = new Date(s);
                      e.setHours(e.getHours() + 1);
                      setDialogState({ mode: "create", start: s, end: e });
                    }}
                  >
                    <PlusIcon /> Add
                  </Button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {loading && !error && (
                <p className="text-xs text-muted-foreground">Loading…</p>
              )}

              {view === "month" ? (
                <CalendarMonthGrid
                  monthDate={currentDate}
                  start={start}
                  end={end}
                  events={events}
                  onSelectDay={(day) => {
                    setCurrentDate(day);
                    setView("day");
                  }}
                  onEventClick={(event) => setDialogState({ mode: "edit", event })}
                />
              ) : (
                <CalendarTimeGrid
                  days={
                    view === "day"
                      ? [currentDate]
                      : Array.from({ length: 7 }, (_, i) => addDays(start, i))
                  }
                  events={events}
                  onEventClick={(event) => setDialogState({ mode: "edit", event })}
                  onSlotClick={(slotStart, slotEnd) =>
                    setDialogState({ mode: "create", start: slotStart, end: slotEnd })
                  }
                />
              )}
            </>
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
        onSaved={refetch}
      />
    </div>
  );
}
