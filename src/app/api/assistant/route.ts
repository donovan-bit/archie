import { NextResponse } from "next/server";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

import { requireUser } from "@/lib/current-user";
import { resolveAssistantAction, runAssistantTurn } from "@/lib/assistant";
import { revalidatePath } from "next/cache";

// MessageParam is a large SDK type; only shape-check what we actually branch on.
const requestSchema = z.union([
  z.object({
    type: z.literal("message"),
    history: z.array(z.unknown()),
    text: z.string().trim().min(1).max(2000),
  }),
  z.object({
    type: z.literal("confirm"),
    history: z.array(z.unknown()),
    toolUseId: z.string(),
    approved: z.boolean(),
  }),
]);

export async function POST(request: Request) {
  const { session, dbUser } = await requireUser();
  const body = requestSchema.parse(await request.json());
  const history = body.history as MessageParam[];

  const result =
    body.type === "message"
      ? await runAssistantTurn(dbUser.id, session.user?.name, [
          ...history,
          { role: "user", content: body.text },
        ])
      : await resolveAssistantAction(dbUser.id, session.user?.name, history, body.toolUseId, body.approved);

  // Only a confirmed write action changes what the dashboard shows.
  if (body.type === "confirm" && body.approved) {
    revalidatePath("/dashboard");
  }

  return NextResponse.json(result);
}
