import type { CategoryRow, ItemRow, PeriodType } from "@/lib/supabase/types";
import { buildCategoryTree, categoryDotClass } from "@/lib/categories";
import { Card } from "@/components/ui/card";
import { ItemRowView } from "@/components/dashboard/item-row";
import { NewItemDialog } from "@/components/dashboard/new-item-dialog";
import { ImportListDialog } from "@/components/dashboard/import-list-dialog";
import { CategoryFormDialog } from "@/components/dashboard/category-form-dialog";

function ItemList({ items }: { items: ItemRow[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <ItemRowView key={item.id} item={item} />
      ))}
    </div>
  );
}

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
  const tree = buildCategoryTree(categories);
  const uncategorized = items.filter((item) => !item.category_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <CategoryFormDialog />
        <ImportListDialog periodType={periodType} periodStart={periodStart} />
      </div>

      {tree.map(({ category, children }) => {
        const directItems = items.filter((item) => item.category_id === category.id);
        const allCategoryItems = items.filter(
          (item) =>
            item.category_id === category.id ||
            children.some((sub) => sub.id === item.category_id),
        );

        return (
          <Card key={category.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${categoryDotClass(category.color)}`} />
                <h2 className="text-sm font-semibold">{category.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {allCategoryItems.filter((i) => i.status === "completed").length}/
                  {allCategoryItems.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CategoryFormDialog
                  parentId={category.id}
                  parentName={category.name}
                  defaultColor={category.color}
                  trigger={
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      + Subcategory
                    </button>
                  }
                />
                <NewItemDialog
                  periodType={periodType}
                  periodStart={periodStart}
                  categories={categories}
                  defaultCategoryId={category.id}
                />
              </div>
            </div>

            <ItemList items={directItems} />

            {children.map((sub) => {
              const subItems = items.filter((item) => item.category_id === sub.id);
              return (
                <div
                  key={sub.id}
                  className="flex flex-col gap-2 border-l-2 border-border pl-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-muted-foreground">
                      {sub.name}
                    </h3>
                    <NewItemDialog
                      periodType={periodType}
                      periodStart={periodStart}
                      categories={categories}
                      defaultCategoryId={sub.id}
                      trigger={
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          + Add
                        </button>
                      }
                    />
                  </div>
                  <ItemList items={subItems} />
                </div>
              );
            })}
          </Card>
        );
      })}

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
        <ItemList items={uncategorized} />
      </Card>
    </div>
  );
}
