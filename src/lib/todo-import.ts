import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { CategoryRow } from "@/lib/supabase/types";

const ParsedItemsSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      notes: z.string().optional(),
      topLevelCategory: z.string(),
      subcategory: z.string().optional(),
    }),
  ),
});

export interface ParsedTodoItem {
  title: string;
  notes?: string;
  topLevelCategory: string | null;
  subcategory: string | null;
}

let client: Anthropic | null = null;

function anthropic() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }
  client = new Anthropic({ apiKey });
  return client;
}

/**
 * Uses Claude to split a freeform pasted to-do list into discrete items,
 * filing each under one of the user's existing top-level categories. Within
 * that top-level category, Claude either reuses an existing subcategory or
 * invents a new, short one when it spots a real cluster of related items in
 * the pasted text (e.g. several "clinic admin" tasks) -- the actual
 * creation of any new subcategory happens in the caller, since this
 * function only reads categories.
 */
export async function parseTodoListWithAI(
  text: string,
  categories: CategoryRow[],
): Promise<ParsedTodoItem[]> {
  const topLevel = categories.filter((c) => !c.parent_id);
  const topLevelNames = topLevel.map((c) => c.name);

  const existingByParent = new Map<string, string[]>();
  for (const sub of categories.filter((c) => c.parent_id)) {
    const parentName = topLevel.find((t) => t.id === sub.parent_id)?.name;
    if (!parentName) continue;
    existingByParent.set(parentName, [...(existingByParent.get(parentName) ?? []), sub.name]);
  }
  const subcategoryHints = topLevelNames
    .map((name) => `${name}: ${existingByParent.get(name)?.join(", ") || "(none yet)"}`)
    .join("; ");

  const response = await anthropic().messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system:
      "You split a pasted to-do list into individual actionable items, sort each into the single best-fitting " +
      "top-level category, and organize items within that category into subcategories based on what you actually " +
      "see in the list -- like a smart assistant building out folders as it reads, not just filing into a fixed " +
      "set. The input may be bullet points, numbered lines, comma-separated, or a messy paragraph -- extract one " +
      "item per distinct task, stripping list markers and cleaning up wording, but keep the user's intent; put " +
      "extra detail in notes rather than a bloated title. Don't invent tasks that aren't implied by the text.\n\n" +
      `Top-level categories (pick exactly one per item, or "Uncategorized" if truly nothing fits): ${topLevelNames.join(", ") || "(none)"}.\n\n` +
      `Existing subcategories per top-level category, reuse these by exact name when an item fits one: ${subcategoryHints || "(none yet)"}.\n\n` +
      "For each item, also decide a subcategory within its top-level category: reuse an existing one by exact name " +
      "if it fits, invent a short new subcategory name (2-3 words) if you see a real cluster of related items that " +
      "deserves its own grouping (e.g. several items about the same project, event, or sub-area of the business), " +
      "or leave subcategory unset if the item is a one-off that doesn't belong in any group. Don't invent a new " +
      "subcategory for a single isolated item -- only when the pasted text itself shows a genuine cluster.",
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(ParsedItemsSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Archie couldn't process that list");
  }

  return response.parsed_output.items
    .filter((item) => item.title.trim().length > 0)
    .map((item) => ({
      title: item.title.trim(),
      notes: item.notes?.trim() || undefined,
      topLevelCategory:
        item.topLevelCategory.trim().toLowerCase() === "uncategorized"
          ? null
          : item.topLevelCategory.trim(),
      subcategory: item.subcategory?.trim() || null,
    }));
}
