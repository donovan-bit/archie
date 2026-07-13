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
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";

import type { CalendarEvent } from "@/lib/google/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "@/components/dashboard/event-form-dialog";
import { CalendarTimeGrid } from "@/components/dashboard/calendar-time-grid";
import { CalendarMonthGrid } from "@/components/dashboard/calendar-month-grid";
import { DashboardSection } from "@/components/dashboard/dashboard-section";

export type CalendarViewMode = "day" | "week" | "month";
type ViewMode = CalendarViewMode;

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

          {view === "month" ? (
            <CalendarMonthGrid
              monthDate={currentDate}
              start={start}
              end={end}
              events={events}
              onSelectDay={(day) => {
                setCurrentDate(day);
                onViewChange("day");
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

      <EventFormDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        event={dialogState?.mode === "edit" ? dialogState.event : undefined}
        initialStart={dialogState?.mode === "create" ? dialogState.start : undefined}
        initialEnd={dialogState?.mode === "create" ? dialogState.end : undefined}
        onSaved={fetchEvents}
      />
    </DashboardSection>
  );
}
