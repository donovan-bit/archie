"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { format } from "date-fns";

import type { CalendarEvent } from "@/lib/google/calendar";
import { Button } from "@/components/ui/button";
import { deleteCalendarEventAction } from "@/app/dashboard/actions";

export function EventRow({ event }: { event: CalendarEvent }) {
  const [isPending, startTransition] = useTransition();

  const timeLabel = event.allDay
    ? "All day"
    : event.start
      ? format(new Date(event.start), "d MMM, h:mm a")
      : "";

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/60">
      <div className="w-24 shrink-0 text-xs text-muted-foreground">{timeLabel}</div>
      <span className="flex-1 truncate text-sm">{event.title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Delete event"
        disabled={isPending}
        onClick={() =>
          startTransition(() => deleteCalendarEventAction(event.id))
        }
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
