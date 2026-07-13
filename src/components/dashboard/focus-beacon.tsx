"use client";

import { FlameIcon } from "lucide-react";

import type { ItemRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FocusBeacon({
  item,
  onClear,
  className,
}: {
  item: Pick<ItemRow, "id" | "title"> | null;
  onClear: () => void;
  className?: string;
}) {
  if (!item) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        <FlameIcon className="size-4" />
        No focus set. Star an item below to make it your one thing right now.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-focus/40 bg-focus/10 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <FlameIcon className="size-5 shrink-0 text-focus" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Focus
          </p>
          <p className="text-base font-semibold leading-tight">{item.title}</p>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
