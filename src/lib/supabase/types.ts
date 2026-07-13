export type PeriodType = "day" | "week" | "month" | "quarter" | "year";
export type ItemStatus = "pending" | "completed" | "rolled_over" | "archived";

export type AppUserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  timezone: string;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type ItemRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  notes: string | null;
  period_type: PeriodType;
  period_start: string;
  status: ItemStatus;
  is_focus: boolean;
  sort_order: number;
  rolled_over_from_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: AppUserRow;
        Insert: Partial<AppUserRow> & Pick<AppUserRow, "email">;
        Update: Partial<AppUserRow>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: Partial<CategoryRow> & Pick<CategoryRow, "user_id" | "name">;
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
      items: {
        Row: ItemRow;
        Insert: Partial<ItemRow> &
          Pick<ItemRow, "user_id" | "title" | "period_type" | "period_start">;
        Update: Partial<ItemRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
