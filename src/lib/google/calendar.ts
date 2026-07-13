import "server-only";
import { google } from "googleapis";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  htmlLink: string | null;
  colorId: string | null;
}

function calendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export async function listCalendarEvents(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string,
): Promise<CalendarEvent[]> {
  const calendar = calendarClient(accessToken);
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMinIso,
    timeMax: timeMaxIso,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 100,
  });

  return (res.data.items ?? []).map((event) => ({
    id: event.id ?? "",
    title: event.summary ?? "(untitled)",
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
    allDay: Boolean(event.start?.date && !event.start?.dateTime),
    htmlLink: event.htmlLink ?? null,
    colorId: event.colorId ?? null,
  }));
}

export async function createCalendarEvent(
  accessToken: string,
  input: { summary: string; start: string; end: string; colorId?: string | null },
) {
  const calendar = calendarClient(accessToken);
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: input.summary,
      start: { dateTime: input.start },
      end: { dateTime: input.end },
      ...(input.colorId ? { colorId: input.colorId } : {}),
    },
  });
  return res.data;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  input: { summary?: string; start?: string; end?: string; colorId?: string | null },
) {
  const calendar = calendarClient(accessToken);
  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: {
      ...(input.summary ? { summary: input.summary } : {}),
      ...(input.start ? { start: { dateTime: input.start } } : {}),
      ...(input.end ? { end: { dateTime: input.end } } : {}),
      // colorId: null means "reset to calendar default" -- Google accepts "" for that.
      ...(input.colorId !== undefined ? { colorId: input.colorId ?? "" } : {}),
    },
  });
  return res.data;
}

export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const calendar = calendarClient(accessToken);
  await calendar.events.delete({ calendarId: "primary", eventId });
}
