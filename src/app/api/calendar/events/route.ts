import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listCalendarEvents } from "@/lib/google/calendar";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.accessToken) {
    return NextResponse.json({ events: [] });
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");
  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "Missing timeMin/timeMax" },
      { status: 400 },
    );
  }

  try {
    const events = await listCalendarEvents(session.accessToken, timeMin, timeMax);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Failed to list calendar events", error);
    return NextResponse.json(
      { error: "Failed to load calendar events" },
      { status: 502 },
    );
  }
}
