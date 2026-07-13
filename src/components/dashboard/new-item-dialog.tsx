"use client";

import { Fragment, useState, useTransition, type ReactNode } from "react";
import { PlusIcon } from "lucide-react";

import type { CategoryRow, PeriodType } from "@/lib/supabase/types";
import { buildCategoryTree } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createItemAction } from "@/app/dashboard/actions";

export function NewItemDialog({
  periodType,
  periodStart,
  categories,
  defaultCategoryId,
  trigger,
}: {
  periodType: PeriodType;
  periodStart: string;
  categories: CategoryRow[];
  defaultCategoryId?: string;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(
    defaultCategoryId,
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await createItemAction({
        title,
        notes: notes || undefined,
        categoryId,
        periodType,
        periodStart,
      });
      setTitle("");
      setNotes("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            <PlusIcon /> Add item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New item</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-title">Title</Label>
            <Input
              id="item-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="item-notes">Notes (optional)</Label>
            <Textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="item-category">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  {buildCategoryTree(categories).map(({ category, children }) => (
                    <Fragment key={category.id}>
                      <SelectItem value={category.id}>{category.name}</SelectItem>
                      {children.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          &nbsp;&nbsp;{sub.name}
                        </SelectItem>
                      ))}
                    </Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
