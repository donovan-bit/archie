import { NextResponse } from "next/server";

import { rolloverDuePeriods } from "@/lib/items";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await rolloverDuePeriods();
  return NextResponse.json({ ok: true, ...result });
}
