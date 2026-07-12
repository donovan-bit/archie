import { FlameIcon } from "lucide-react";

import type { ItemRow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { setFocusAction } from "@/app/dashboard/actions";

export function FocusBeacon({ item }: { item: ItemRow | null }) {
  if (!item) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <FlameIcon className="size-4" />
        No focus set. Star an item below to make it your one thing right now.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-focus/40 bg-focus/10 p-4">
      <div className="flex items-center gap-3">
        <FlameIcon className="size-5 shrink-0 text-focus" />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Focus
          </p>
          <p className="text-base font-semibold leading-tight">{item.title}</p>
        </div>
      </div>
      <form
        action={async () => {
          "use server";
          await setFocusAction(null);
        }}
      >
        <Button type="submit" variant="ghost" size="sm">
          Clear
        </Button>
      </form>
    </div>
  );
}
