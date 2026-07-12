"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/current-user";
import {
  createCategory,
  createItem,
  deleteItem,
  listCategories,
  setFocusItem,
  updateItem,
  updateItemStatus,
} from "@/lib/items";
import type { ItemStatus, PeriodType } from "@/lib/supabase/types";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/google/calendar";
import { parseTodoListWithAI } from "@/lib/todo-import";

const periodTypeSchema = z.enum(["day", "week", "month", "quarter", "year"]);

const createItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  periodType: periodTypeSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function createItemAction(input: {
  title: string;
  notes?: string;
  categoryId?: string;
  periodType: PeriodType;
  periodStart: string;
}) {
  const { dbUser } = await requireUser();
  const parsed = createItemSchema.parse(input);

  await createItem({
    userId: dbUser.id,
    title: parsed.title,
    notes: parsed.notes,
    categoryId: parsed.categoryId,
    periodType: parsed.periodType,
    periodStart: parsed.periodStart,
  });

  revalidatePath("/dashboard");
}

export async function importItemsAction(input: {
  text: string;
  periodType: PeriodType;
  periodStart: string;
}) {
  const { dbUser } = await requireUser();
  const text = input.text.trim();
  if (!text) return { imported: 0 };

  const periodType = periodTypeSchema.parse(input.periodType);
  const periodStart = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(input.periodStart);

  const categories = await listCategories(dbUser.id);
  const parsedItems = await parseTodoListWithAI(text, categories);

  for (const item of parsedItems) {
    await createItem({
      userId: dbUser.id,
      title: item.title,
      notes: item.notes,
      categoryId: item.categoryId ?? undefined,
      periodType,
      periodStart,
    });
  }

  revalidatePath("/dashboard");
  return { imported: parsedItems.length };
}

export async function setItemStatusAction(itemId: string, status: ItemStatus) {
  const { dbUser } = await requireUser();
  await updateItemStatus(dbUser.id, itemId, status);
  revalidatePath("/dashboard");
}

export async function updateItemAction(
  itemId: string,
  patch: { title?: string; notes?: string; categoryId?: string | null },
) {
  const { dbUser } = await requireUser();
  await updateItem(dbUser.id, itemId, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.categoryId !== undefined ? { category_id: patch.categoryId } : {}),
  });
  revalidatePath("/dashboard");
}

export async function deleteItemAction(itemId: string) {
  const { dbUser } = await requireUser();
  await deleteItem(dbUser.id, itemId);
  revalidatePath("/dashboard");
}

export async function setFocusAction(itemId: string | null) {
  const { dbUser } = await requireUser();
  await setFocusItem(dbUser.id, itemId);
  revalidatePath("/dashboard");
}

export async function createCategoryAction(name: string, color: string) {
  const { dbUser } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return;
  await createCategory(dbUser.id, trimmed, color);
  revalidatePath("/dashboard");
}

export async function createCalendarEventAction(input: {
  title: string;
  startIso: string;
  endIso: string;
}) {
  const { session } = await requireUser();
  if (!session.accessToken) {
    throw new Error("No Google access token on session");
  }
  await createCalendarEvent(session.accessToken, {
    summary: input.title,
    start: input.startIso,
    end: input.endIso,
  });
  revalidatePath("/dashboard");
}

export async function updateCalendarEventAction(
  eventId: string,
  input: { title?: string; startIso?: string; endIso?: string },
) {
  const { session } = await requireUser();
  if (!session.accessToken) {
    throw new Error("No Google access token on session");
  }
  await updateCalendarEvent(session.accessToken, eventId, {
    summary: input.title,
    start: input.startIso,
    end: input.endIso,
  });
  revalidatePath("/dashboard");
}

export async function deleteCalendarEventAction(eventId: string) {
  const { session } = await requireUser();
  if (!session.accessToken) {
    throw new Error("No Google access token on session");
  }
  await deleteCalendarEvent(session.accessToken, eventId);
  revalidatePath("/dashboard");
}
