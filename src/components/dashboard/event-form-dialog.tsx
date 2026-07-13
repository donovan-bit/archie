"use client";

import { useEffect, useState, useTransition } from "react";

import type { CalendarEvent } from "@/lib/google/calendar";
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from "@/lib/google/event-colors";
import { cn } from "@/lib/utils";
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
  const [colorId, setColorId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const timeoutId = setTimeout(() => {
      setTitle(event?.title ?? "");
      setColorId(event?.colorId ?? null);
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
          colorId,
        });
      } else {
        await createCalendarEventAction({
          title,
          startIso: new Date(start).toISOString(),
          endIso: new Date(end).toISOString(),
          colorId,
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
          <div className="flex flex-col gap-1.5">
            <Label>Colour</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-label={DEFAULT_EVENT_COLOR.name}
                title={DEFAULT_EVENT_COLOR.name}
                onClick={() => setColorId(null)}
                style={{ backgroundColor: DEFAULT_EVENT_COLOR.bg }}
                className={cn(
                  "size-6 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                  colorId === null ? "ring-2 ring-ring" : "hover:ring-2 hover:ring-border",
                )}
              />
              {EVENT_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => setColorId(color.id)}
                  style={{ backgroundColor: color.bg }}
                  className={cn(
                    "size-6 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                    colorId === color.id ? "ring-2 ring-ring" : "hover:ring-2 hover:ring-border",
                  )}
                />
              ))}
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
