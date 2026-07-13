"use client";

import { Fragment, useState, useTransition } from "react";
import { PencilIcon } from "lucide-react";

import type { CategoryRow, ItemRow } from "@/lib/supabase/types";
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
import { updateItemAction } from "@/app/dashboard/actions";

const NO_CATEGORY = "__none__";

export function EditItemDialog({
  item,
  categories,
}: {
  item: ItemRow;
  categories: CategoryRow[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [categoryId, setCategoryId] = useState(item.category_id ?? NO_CATEGORY);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      setTitle(item.title);
      setNotes(item.notes ?? "");
      setCategoryId(item.category_id ?? NO_CATEGORY);
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      await updateItemAction(item.id, {
        title,
        notes,
        categoryId: categoryId === NO_CATEGORY ? null : categoryId,
      });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Edit item"
        >
          <PencilIcon className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-item-title">Title</Label>
            <Input
              id="edit-item-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-item-notes">Notes (optional)</Label>
            <Textarea
              id="edit-item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-item-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="edit-item-category">
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>No category</SelectItem>
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
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
