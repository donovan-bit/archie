"use client";

import { useState, useTransition, type ReactNode } from "react";
import { PlusIcon } from "lucide-react";

import type { CalendarEvent } from "@/lib/google/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
} from "@/app/dashboard/actions";

function defaultStart() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventFormDialog({
  event,
  trigger,
}: {
  event?: CalendarEvent;
  trigger?: ReactNode;
}) {
  const isEditing = Boolean(event);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(() =>
    toLocalInputValue(event?.start ? new Date(event.start) : defaultStart()),
  );
  const [end, setEnd] = useState(() => {
    if (event?.end) return toLocalInputValue(new Date(event.end));
    const d = defaultStart();
    d.setHours(d.getHours() + 1);
    return toLocalInputValue(d);
  });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !start || !end) return;
    startTransition(async () => {
      if (event) {
        await updateCalendarEventAction(event.id, {
          title,
          startIso: new Date(start).toISOString(),
          endIso: new Date(end).toISOString(),
        });
      } else {
        await createCalendarEventAction({
          title,
          startIso: new Date(start).toISOString(),
          endIso: new Date(end).toISOString(),
        });
        setTitle("");
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            <PlusIcon /> Add event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit calendar event" : "New calendar event"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Saving…"
                  : "Adding…"
                : isEditing
                  ? "Save changes"
                  : "Add event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
