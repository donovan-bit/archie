"use client";

import { useState, useTransition } from "react";
import { SparklesIcon } from "lucide-react";

import type { PeriodType } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importItemsAction } from "@/app/dashboard/actions";

export function ImportListDialog({
  periodType,
  periodStart,
}: {
  periodType: PeriodType;
  periodStart: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await importItemsAction({ text, periodType, periodStart });
        setText("");
        setOpen(false);
      } catch {
        setError("Archie couldn't organize that list -- try again in a moment.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <SparklesIcon /> Paste list
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Paste a to-do list</DialogTitle>
            <DialogDescription>
              Paste in any list -- bullets, numbered, or just a paragraph.
              Archie will split it into items and sort them into your
              categories.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="import-text">List</Label>
            <Textarea
              id="import-text"
              autoFocus
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Call the accountant\nBook Clint's PMP review\nPick up mower parts"}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Organizing…" : "Organize with Archie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
