"use client";

import { StarIcon, Trash2Icon } from "lucide-react";

import type { ItemRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function ItemRowView({
  item,
  onToggleComplete,
  onToggleFocus,
  onDelete,
}: {
  item: ItemRow;
  onToggleComplete: (checked: boolean) => void;
  onToggleFocus: () => void;
  onDelete: () => void;
}) {
  const completed = item.status === "completed";

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-opacity hover:bg-accent/60">
      <Checkbox
        checked={completed}
        onCheckedChange={(checked) => onToggleComplete(Boolean(checked))}
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
        aria-label={item.is_focus ? "Clear focus" : "Set as focus"}
        className={cn(
          "opacity-0 transition-opacity group-hover:opacity-100",
          item.is_focus && "opacity-100",
        )}
        onClick={onToggleFocus}
      >
        <StarIcon
          className={cn(
            "size-4",
            item.is_focus ? "fill-focus text-focus" : "text-muted-foreground",
          )}
        />
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Delete item"
        onClick={onDelete}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
