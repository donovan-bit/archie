"use client";

import { useState, useTransition, type ReactNode } from "react";
import { PlusIcon } from "lucide-react";

import { CATEGORY_COLORS } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCategoryAction } from "@/app/dashboard/actions";

export function CategoryFormDialog({
  parentId,
  parentName,
  defaultColor,
  trigger,
}: {
  parentId?: string;
  parentName?: string;
  defaultColor?: string;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor ?? CATEGORY_COLORS[0]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createCategoryAction(name, color, parentId ?? null);
      setName("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            <PlusIcon /> Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {parentName ? `New subcategory under ${parentName}` : "New category"}
            </DialogTitle>
            {parentName && (
              <DialogDescription>
                Items in this subcategory still count toward {parentName} overall.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-color">Colour</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger id="category-color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_COLORS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
