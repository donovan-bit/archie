import type { CategoryRow, ItemRow, PeriodType } from "@/lib/supabase/types";
import { categoryDotClass } from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { ItemRowView } from "@/components/dashboard/item-row";
import { NewItemDialog } from "@/components/dashboard/new-item-dialog";
import { ImportListDialog } from "@/components/dashboard/import-list-dialog";

export function ItemBoard({
  items,
  categories,
  periodType,
  periodStart,
}: {
  items: ItemRow[];
  categories: CategoryRow[];
  periodType: PeriodType;
  periodStart: string;
}) {
  const groups = categories.map((category) => ({
    category,
    items: items.filter((item) => item.category_id === category.id),
  }));

  const uncategorized = items.filter((item) => !item.category_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ImportListDialog periodType={periodType} periodStart={periodStart} />
      </div>

      {groups.map(({ category, items: categoryItems }) => (
        <Card key={category.id}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${categoryDotClass(category.color)}`} />
              <h2 className="text-sm font-semibold">{category.name}</h2>
              <span className="text-xs text-muted-foreground">
                {categoryItems.filter((i) => i.status === "completed").length}/
                {categoryItems.length}
              </span>
            </div>
            <NewItemDialog
              periodType={periodType}
              periodStart={periodStart}
              categories={categories}
              defaultCategoryId={category.id}
            />
          </div>
          {categoryItems.length > 0 ? (
            <div className="flex flex-col divide-y divide-border">
              {categoryItems.map((item) => (
                <ItemRowView key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          )}
        </Card>
      ))}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Uncategorized
          </h2>
          <NewItemDialog
            periodType={periodType}
            periodStart={periodStart}
            categories={categories}
          />
        </div>
        {uncategorized.length > 0 ? (
          <div className="flex flex-col divide-y divide-border">
            {uncategorized.map((item) => (
              <ItemRowView key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </Card>
    </div>
  );
}
