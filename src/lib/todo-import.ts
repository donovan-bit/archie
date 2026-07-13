import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { CategoryRow } from "@/lib/supabase/types";
import { categoryPath } from "@/lib/categories";

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
 * the closest matching one of the user's existing categories -- including
 * subcategories, e.g. "Business > Clinic admin".
 */
export async function parseTodoListWithAI(
  text: string,
  categories: CategoryRow[],
): Promise<ParsedTodoItem[]> {
  const pathOptions = categories.map((c) => categoryPath(c, categories));

  const response = await anthropic().messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system:
      "You split a pasted to-do list into individual actionable items and sort each into the single best-fitting " +
      "category. The input may be bullet points, numbered lines, comma-separated, or a messy paragraph -- extract " +
      "one item per distinct task, stripping list markers and cleaning up wording, but keep the user's intent and " +
      "any useful detail as notes if it doesn't belong in the title. Don't invent tasks that aren't implied by the " +
      "text, and don't merge unrelated tasks into one. " +
      `Categories available (some are "Parent > Child" subcategories -- prefer the most specific one that fits, ` +
      `only use the bare parent name when none of its subcategories fit): ${pathOptions.length ? pathOptions.join(", ") : "(none)"}, ` +
      'or "Uncategorized" if genuinely nothing fits. Only ever return a category exactly as written in that list, ' +
      "or \"Uncategorized\" -- never invent a new category or subcategory name.",
    messages: [{ role: "user", content: text }],
    output_config: { format: zodOutputFormat(ParsedItemsSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Archie couldn't process that list");
  }

  const byPath = new Map(
    categories.map((c) => [categoryPath(c, categories).toLowerCase(), c.id]),
  );

  return response.parsed_output.items
    .filter((item) => item.title.trim().length > 0)
    .map((item) => ({
      title: item.title.trim(),
      notes: item.notes?.trim() || undefined,
      categoryId: byPath.get(item.category.trim().toLowerCase()) ?? null,
    }));
}
