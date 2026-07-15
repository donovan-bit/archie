import "server-only";
import { cache } from "react";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { CategoryRow, ItemRow, ItemStatus, PeriodType } from "@/lib/supabase/types";
import { nowInBrisbane, periodEndFor, periodStartFor, toDateKey } from "@/lib/dates";

// No subcategories are pre-seeded -- they're created on demand, either by
// the user via "+ Subcategory" or by the AI list-import when it spots a
// real cluster of related items, so a fresh category never shows empty
// placeholder groups.
const DEFAULT_CATEGORIES = [
  { name: "Business", color: "blue" },
  { name: "Health", color: "green" },
  { name: "Family", color: "amber" },
  { name: "Personal", color: "violet" },
];

export async function upsertAppUser(user: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("app_users")
    .upsert(
      { email: user.email, name: user.name ?? null, image: user.image ?? null },
      { onConflict: "email" },
    )
    .select()
    .single();

  if (error) throw error;

  await ensureDefaultCategories(data.id);

  return data;
}

/**
 * Wrapped in React's cache() so repeated calls with the same email within a
 * single request (a Server Action mutation followed by the page re-render
 * that revalidatePath triggers as part of the same response) reuse one
 * Supabase round trip instead of two.
 */
export const getUserByEmail = cache(async (email: string) => {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("app_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
});

async function ensureDefaultCategories(userId: string) {
  const db = supabaseAdmin();
  const { count, error: countError } = await db
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw countError;
  if (count && count > 0) return;

  const { error } = await db.from("categories").insert(
    DEFAULT_CATEGORIES.map((c, i) => ({
      user_id: userId,
      name: c.name,
      color: c.color,
      sort_order: i,
    })),
  );
  if (error) throw error;
}

export async function listCategories(userId: string): Promise<CategoryRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  userId: string,
  name: string,
  color: string,
  parentId?: string | null,
) {
  const db = supabaseAdmin();
  const countQuery = db
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  const { count } = await (parentId
    ? countQuery.eq("parent_id", parentId)
    : countQuery.is("parent_id", null));
  const { data, error } = await db
    .from("categories")
    .insert({
      user_id: userId,
      name,
      color,
      parent_id: parentId ?? null,
      sort_order: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listItemsForPeriod(
  userId: string,
  periodType: PeriodType,
  periodStart: string,
): Promise<ItemRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .eq("period_type", periodType)
    .eq("period_start", periodStart)
    .neq("status", "archived")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getItem(userId: string, itemId: string): Promise<ItemRow | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFocusItem(userId: string): Promise<ItemRow | null> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .eq("is_focus", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createItem(input: {
  userId: string;
  title: string;
  notes?: string;
  categoryId?: string | null;
  periodType: PeriodType;
  periodStart: string;
}) {
  const db = supabaseAdmin();
  const { count } = await db
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("period_type", input.periodType)
    .eq("period_start", input.periodStart);

  const { data, error } = await db
    .from("items")
    .insert({
      user_id: input.userId,
      title: input.title,
      notes: input.notes ?? null,
      category_id: input.categoryId ?? null,
      period_type: input.periodType,
      period_start: input.periodStart,
      sort_order: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItemStatus(
  userId: string,
  itemId: string,
  status: ItemStatus,
) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("items")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(
  userId: string,
  itemId: string,
  patch: Partial<Pick<ItemRow, "title" | "notes" | "category_id">>,
) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("items")
    .update(patch)
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(userId: string, itemId: string) {
  const db = supabaseAdmin();
  const { error } = await db
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function setFocusItem(userId: string, itemId: string | null) {
  const db = supabaseAdmin();

  const { error: clearError } = await db
    .from("items")
    .update({ is_focus: false })
    .eq("user_id", userId)
    .eq("is_focus", true);
  if (clearError) throw clearError;

  if (!itemId) return null;

  const { data, error } = await db
    .from("items")
    .update({ is_focus: true })
    .eq("id", itemId)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Carries every still-pending item whose period has ended forward into the
 * next equivalent period (next day/week/month/quarter/year), preserving
 * lineage via rolled_over_from_id. Intended to be called once per day by
 * the rollover cron route, across all users.
 */
export async function rolloverDuePeriods(referenceDate: Date = nowInBrisbane()) {
  const db = supabaseAdmin();
  const today = toDateKey(referenceDate);

  const { data: pending, error } = await db
    .from("items")
    .select("*")
    .eq("status", "pending");
  if (error) throw error;

  const due = (pending ?? []).filter(
    (item) => periodEndFor(item.period_type, item.period_start) < today,
  );

  let rolled = 0;
  for (const item of due) {
    // Land in the period that contains `referenceDate`, not just the next
    // one after the item's own period -- this keeps behaviour correct even
    // if the cron missed several days (e.g. the app/server was down).
    const nextStart = periodStartFor(item.period_type, referenceDate);

    // Single atomic statement (see migration 0003) instead of a separate
    // insert + update: if this call never lands (timeout, crash), the item
    // is simply still 'pending' next run -- not copied but left un-marked,
    // which used to spawn a fresh duplicate every day forever.
    const { error: rolloverError } = await db.rpc("rollover_item", {
      p_item_id: item.id,
      p_next_period_start: nextStart,
    });
    if (rolloverError) throw rolloverError;

    rolled += 1;
  }

  return { scanned: due.length, rolled };
}
