import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const ParsedItemsSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      notes: z.string().optional(),
    }),
  ),
});

export interface ParsedTodoItem {
  title: string;
  notes?: string;
  categoryId: string | null;
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
 * Uses Claude to split a freeform pasted to-do list (bullets, numbered
 * lines, a messy paragraph, whatever) into discrete items, each assigned to
 * the closest matching one of the user's existing categories.
 */
export async function parseTodoListWithAI(
  text: string,
  categories: { id: string; name: string }[],
): Promise<ParsedTodoItem[]> {
  const categoryNames = categories.map((c) => c.name);

  const response = await anthropic().messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system:
      "You split a pasted to-do list into individual actionable items and sort each into the best-fitting category. " +
      "The input may be bullet points, numbered lines, comma-separated, or a messy paragraph -- extract one item per " +
      "distinct task, stripping list markers and cleaning up wording, but keep the user's intent and any useful detail. " +
      "Don't invent tasks that aren't implied by the text. " +
      `Categories available: ${categoryNames.length ? categoryNames.join(", ") : "(none)"}, or "Uncategorized" ` +
      "if nothing fits well. Only use a category name from that exact list (or \"Uncategorized\") -- never invent a new one.",
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(ParsedItemsSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Archie couldn't process that list");
  }

  const byLowerName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  return response.parsed_output.items
    .filter((item) => item.title.trim().length > 0)
    .map((item) => ({
      title: item.title.trim(),
      notes: item.notes?.trim() || undefined,
      categoryId: byLowerName.get(item.category.trim().toLowerCase()) ?? null,
    }));
}
