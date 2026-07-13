"use client";

import { useOptimistic, useTransition } from "react";
import { StarIcon, Trash2Icon } from "lucide-react";

import type { ItemRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  deleteItemAction,
  setFocusAction,
  setItemStatusAction,
} from "@/app/dashboard/actions";

export function ItemRowView({ item }: { item: ItemRow }) {
  const [optimisticItem, setOptimisticItem] = useOptimistic(item);
  // Covers the checkbox and focus star -- useOptimistic's setter must run
  // inside a transition, so both flip instantly instead of waiting for the
  // server round trip.
  const [, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const completed = optimisticItem.status === "completed";

  function toggleComplete(checked: boolean) {
    startTransition(async () => {
      setOptimisticItem((prev) => ({
        ...prev,
        status: checked ? "completed" : "pending",
      }));
      await setItemStatusAction(item.id, checked ? "completed" : "pending");
    });
  }

  function toggleFocus() {
    startTransition(async () => {
      setOptimisticItem((prev) => ({ ...prev, is_focus: !prev.is_focus }));
      await setFocusAction(item.is_focus ? null : item.id);
    });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-2 transition-opacity hover:bg-accent/60",
        isDeleting && "opacity-60",
      )}
    >
      <Checkbox
        checked={completed}
        onCheckedChange={(checked) => toggleComplete(Boolean(checked))}
        aria-label={completed ? "Mark as not done" : "Mark as done"}
      />
      <span
        className={cn(
          "flex-1 text-sm",
          completed && "text-muted-foreground line-through",
        )}
      >
        {item.title}
      </span>
      <button
        type="button"
        aria-label={optimisticItem.is_focus ? "Clear focus" : "Set as focus"}
        className={cn(
          "opacity-0 transition-opacity group-hover:opacity-100",
          optimisticItem.is_focus && "opacity-100",
        )}
        onClick={toggleFocus}
      >
        <StarIcon
          className={cn(
            "size-4",
            optimisticItem.is_focus
              ? "fill-focus text-focus"
              : "text-muted-foreground",
          )}
        />
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Delete item"
        onClick={() => startDeleteTransition(() => deleteItemAction(item.id))}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
