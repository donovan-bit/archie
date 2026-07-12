"use client";

import { useEffect, useState, useTransition } from "react";

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
} from "@/components/ui/dialog";
import {
  createCalendarEventAction,
  deleteCalendarEventAction,
  updateCalendarEventAction,
} from "@/app/dashboard/actions";

function roundToNextHour(date: Date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  initialStart,
  initialEnd,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent;
  initialStart?: Date;
  initialEnd?: Date;
  onSaved: () => void;
}) {
  const isEditing = Boolean(event);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => {
      setTitle(event?.title ?? "");
      setStart(
        toLocalInputValue(
          event?.start ? new Date(event.start) : (initialStart ?? roundToNextHour(new Date())),
        ),
      );
      setEnd(
        toLocalInputValue(
          event?.end
            ? new Date(event.end)
            : (initialEnd ??
                (() => {
                  const d = roundToNextHour(new Date());
                  d.setHours(d.getHours() + 1);
                  return d;
                })()),
        ),
      );
    }, 0);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.id]);

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
      }
      onOpenChange(false);
      onSaved();
    });
  }

  function handleDelete() {
    if (!event) return;
    startTransition(async () => {
      await deleteCalendarEventAction(event.id);
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <DialogFooter className="sm:justify-between">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
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
