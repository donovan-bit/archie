import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  TextBlockParam,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from "@anthropic-ai/sdk/resources/messages";

import {
  createItem,
  deleteItem,
  getItem,
  listCategories,
  listItemsForPeriod,
  setFocusItem,
  updateItemStatus,
} from "@/lib/items";
import { nowInBrisbane, periodLabel, toDateKey } from "@/lib/dates";
import type { PeriodType } from "@/lib/supabase/types";

const MODEL = "claude-opus-4-8";
const MAX_TOOL_ROUNDS = 6;

// Tools the assistant may call freely, without confirmation -- they only
// read data back for it to reason over.
const READ_TOOLS = new Set(["list_items", "list_categories"]);

// Tools that mutate data. The API layer intercepts these before execution
// and hands control back to the client for a yes/no confirmation instead of
// running them -- see runAssistantTurn's loop below.
const WRITE_TOOLS = new Set([
  "create_item",
  "update_item_status",
  "delete_item",
  "set_focus",
  "clear_focus",
]);

const PERIOD_TYPE_ENUM = ["day", "week", "month", "quarter", "year"];

const TOOLS: Tool[] = [
  {
    name: "list_items",
    description:
      "Read the to-do items for a given period (e.g. today's day list, this week, this month). Use this to see " +
      "what's on the list, including each item's id (needed for update_item_status/delete_item/set_focus), title, " +
      "status, category, and whether it's the current focus item.",
    input_schema: {
      type: "object",
      properties: {
        periodType: { type: "string", enum: PERIOD_TYPE_ENUM },
        periodStart: {
          type: "string",
          description:
            "YYYY-MM-DD date identifying the period. For 'day' this is the exact date. Use today's date from the " +
            "system prompt unless the user asks about a different day/week/etc.",
        },
      },
      required: ["periodType", "periodStart"],
    },
  },
  {
    name: "list_categories",
    description: "Read the user's categories and subcategories, with their ids.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_item",
    description: "Create a new to-do item. Only call this when the user has explicitly asked to add something.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        notes: { type: "string" },
        categoryId: { type: "string", description: "Id of an existing category/subcategory from list_categories." },
        periodType: { type: "string", enum: PERIOD_TYPE_ENUM },
        periodStart: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["title", "periodType", "periodStart"],
    },
  },
  {
    name: "update_item_status",
    description: "Mark an item as done or not done. Only call this when the user has explicitly asked for it.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string" },
        status: { type: "string", enum: ["completed", "pending"] },
      },
      required: ["itemId", "status"],
    },
  },
  {
    name: "delete_item",
    description: "Permanently delete an item. Only call this when the user has explicitly asked to remove/delete it.",
    input_schema: {
      type: "object",
      properties: { itemId: { type: "string" } },
      required: ["itemId"],
    },
  },
  {
    name: "set_focus",
    description: "Set the one active focus item. Only call this when the user has explicitly asked to focus on something.",
    input_schema: {
      type: "object",
      properties: { itemId: { type: "string" } },
      required: ["itemId"],
    },
  },
  {
    name: "clear_focus",
    description: "Clear the current focus item.",
    input_schema: { type: "object", properties: {} },
  },
];

function systemPrompt(userName: string | null | undefined): string {
  const today = toDateKey(nowInBrisbane());
  return (
    `You are Archie, ${userName ?? "the user"}'s personal assistant embedded in his to-do dashboard. ` +
    `Today's date is ${today} (Australia/Brisbane).\n\n` +
    "You can freely read the to-do list and categories. For anything that changes data (creating, completing, " +
    "deleting, or focusing an item), call exactly one tool per turn and then stop -- the app will show the user a " +
    "confirmation before it actually happens, so don't ask for confirmation in words yourself, just call the tool. " +
    "Never call a write tool for something the user hasn't actually asked for in this conversation -- don't " +
    "proactively reorganize, complete, or delete things on your own initiative. If a request is ambiguous (e.g. " +
    "which item they mean), ask a clarifying question in text instead of guessing.\n\n" +
    "Keep replies short and conversational. This assistant currently only has access to the to-do list -- no " +
    "email, calendar, or finance integrations yet, so say so if asked about those."
  );
}

function anthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  return new Anthropic({ apiKey });
}

async function runReadTool(userId: string, name: string, input: Record<string, unknown>) {
  switch (name) {
    case "list_items": {
      const periodType = input.periodType as PeriodType;
      const periodStart = String(input.periodStart);
      const [items, categories] = await Promise.all([
        listItemsForPeriod(userId, periodType, periodStart),
        listCategories(userId),
      ]);
      const categoryName = new Map(categories.map((c) => [c.id, c.name]));
      return {
        period: periodLabel(periodType, periodStart),
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          notes: i.notes,
          status: i.status,
          category: i.category_id ? categoryName.get(i.category_id) ?? null : null,
          isFocus: i.is_focus,
        })),
      };
    }
    case "list_categories": {
      const categories = await listCategories(userId);
      return categories.map((c) => ({ id: c.id, name: c.name, parentId: c.parent_id }));
    }
    default:
      throw new Error(`Unknown read tool: ${name}`);
  }
}

/** Human-readable summary of a pending write action, shown in the confirmation UI. */
async function describeWriteAction(
  userId: string,
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "create_item": {
      const period = periodLabel(input.periodType as PeriodType, String(input.periodStart));
      return `Add "${input.title}" to ${period}`;
    }
    case "update_item_status": {
      const item = await getItem(userId, String(input.itemId));
      const title = item?.title ?? "that item";
      return input.status === "completed" ? `Mark "${title}" as done` : `Mark "${title}" as not done`;
    }
    case "delete_item": {
      const item = await getItem(userId, String(input.itemId));
      return `Delete "${item?.title ?? "that item"}"`;
    }
    case "set_focus": {
      const item = await getItem(userId, String(input.itemId));
      return `Set "${item?.title ?? "that item"}" as focus`;
    }
    case "clear_focus":
      return "Clear the current focus item";
    default:
      return `Run ${name}`;
  }
}

async function runWriteTool(userId: string, name: string, input: Record<string, unknown>) {
  switch (name) {
    case "create_item":
      return createItem({
        userId,
        title: String(input.title),
        notes: typeof input.notes === "string" ? input.notes : undefined,
        categoryId: typeof input.categoryId === "string" ? input.categoryId : null,
        periodType: input.periodType as PeriodType,
        periodStart: String(input.periodStart),
      });
    case "update_item_status":
      return updateItemStatus(userId, String(input.itemId), input.status as "completed" | "pending");
    case "delete_item":
      return deleteItem(userId, String(input.itemId));
    case "set_focus":
      return setFocusItem(userId, String(input.itemId));
    case "clear_focus":
      return setFocusItem(userId, null);
    default:
      throw new Error(`Unknown write tool: ${name}`);
  }
}

export type PendingAction = { toolUseId: string; label: string };

export type AssistantTurnResult = {
  history: MessageParam[];
  assistantText: string[];
  pendingAction: PendingAction | null;
};

/**
 * Runs the tool-use loop: read tools execute immediately and feed back into
 * the same request; the moment a write tool comes up, the loop stops and
 * hands a pending confirmation back to the caller instead of running it.
 * Stateless across requests -- `history` is round-tripped through the
 * client, which is fine for a single-user personal assistant.
 */
export async function runAssistantTurn(
  userId: string,
  userName: string | null | undefined,
  history: MessageParam[],
): Promise<AssistantTurnResult> {
  const client = anthropic();
  const workingHistory = [...history];
  const assistantText: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt(userName),
      messages: workingHistory,
      tools: TOOLS,
    });

    const assistantParams: (TextBlockParam | ToolUseBlockParam)[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        assistantParams.push({ type: "text", text: block.text });
      } else if (block.type === "tool_use") {
        assistantParams.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
      }
    }
    workingHistory.push({ role: "assistant", content: assistantParams });

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) assistantText.push(block.text);
    }

    const toolUses = response.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) {
      return { history: workingHistory, assistantText, pendingAction: null };
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of toolUses) {
      const input = (block.input ?? {}) as Record<string, unknown>;
      if (READ_TOOLS.has(block.name)) {
        try {
          const result = await runReadTool(userId, block.name, input);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : "Tool failed",
            is_error: true,
          });
        }
      } else if (WRITE_TOOLS.has(block.name)) {
        // Stop here: don't execute, hand back to the client for confirmation.
        // Any tool_use blocks after this one in the same turn (rare -- the
        // system prompt asks for one tool per turn) are told to wait.
        const label = await describeWriteAction(userId, block.name, input);
        for (const rest of toolUses.slice(toolUses.indexOf(block) + 1)) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: rest.id,
            content: "Skipped -- resolve the pending confirmation first.",
            is_error: true,
          });
        }
        if (toolResults.length > 0) workingHistory.push({ role: "user", content: toolResults });
        return {
          history: workingHistory,
          assistantText,
          pendingAction: { toolUseId: block.id, label },
        };
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Unknown tool: ${block.name}`,
          is_error: true,
        });
      }
    }
    workingHistory.push({ role: "user", content: toolResults });
  }

  assistantText.push("That's taking more steps than expected -- let's try a simpler request.");
  return { history: workingHistory, assistantText, pendingAction: null };
}

/**
 * Resolves a pending confirmation: finds the tool_use block the client is
 * responding to in the tail of `history`, either executes it (approved) or
 * records a decline, then resumes the loop.
 */
export async function resolveAssistantAction(
  userId: string,
  userName: string | null | undefined,
  history: MessageParam[],
  toolUseId: string,
  approved: boolean,
): Promise<AssistantTurnResult> {
  const lastAssistant = [...history].reverse().find((m) => m.role === "assistant");
  const block =
    lastAssistant &&
    Array.isArray(lastAssistant.content) &&
    lastAssistant.content.find(
      (b): b is ToolUseBlockParam => typeof b === "object" && b.type === "tool_use" && b.id === toolUseId,
    );

  if (!block) {
    throw new Error("Couldn't find the pending action to confirm");
  }

  const input = (block.input ?? {}) as Record<string, unknown>;
  let resultContent: string;
  let isError = false;
  if (approved) {
    try {
      await runWriteTool(userId, block.name, input);
      resultContent = "Done.";
    } catch (err) {
      resultContent = err instanceof Error ? err.message : "Action failed";
      isError = true;
    }
  } else {
    resultContent = "The user declined this action.";
  }

  const workingHistory: MessageParam[] = [
    ...history,
    {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUseId, content: resultContent, is_error: isError }],
    },
  ];

  return runAssistantTurn(userId, userName, workingHistory);
}
