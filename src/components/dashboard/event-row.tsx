"use client";

import { useTransition } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { format } from "date-fns";

import type { CalendarEvent } from "@/lib/google/calendar";
import { Button } from "@/components/ui/button";
import { deleteCalendarEventAction } from "@/app/dashboard/actions";
import { EventFormDialog } from "@/components/dashboard/event-form-dialog";

function formatTime(iso: string) {
  return format(new Date(iso), "h:mm a");
}

export function EventRow({ event }: { event: CalendarEvent }) {
  const [isPending, startTransition] = useTransition();

  const timeLabel = event.allDay
    ? "All day"
    : event.start && event.end
      ? `${formatTime(event.start)} – ${formatTime(event.end)}`
      : event.start
        ? formatTime(event.start)
        : "";

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/60">
      <div className="w-32 shrink-0 text-xs text-muted-foreground">{timeLabel}</div>
      <span className="flex-1 truncate text-sm">{event.title}</span>
      <EventFormDialog
        event={event}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Edit event"
          >
            <PencilIcon className="size-3.5" />
          </Button>
        }
      />
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
