import { CalendarIcon } from "lucide-react";

import type { CalendarEvent } from "@/lib/google/calendar";
import { Card, CardTitle } from "@/components/ui/card";
import { EventRow } from "@/components/dashboard/event-row";
import { NewEventDialog } from "@/components/dashboard/new-event-dialog";

export function CalendarPanel({
  events,
  error,
  connected,
}: {
  events: CalendarEvent[];
  error: string | null;
  connected: boolean;
}) {
  return (
    <Card className="h-fit">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4" />
          <CardTitle>Calendar</CardTitle>
        </div>
        {connected && <NewEventDialog />}
      </div>

      {!connected && (
        <p className="text-sm text-muted-foreground">
          Calendar access isn&apos;t available for this session. Try signing
          out and back in to re-grant access.
        </p>
      )}
      {connected && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {connected && !error && events.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No events in this period.
        </p>
      )}
      {connected && !error && events.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </Card>
  );
}
