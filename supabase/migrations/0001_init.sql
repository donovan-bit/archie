-- Archie Phase 1 schema: users, categories, goals/tasks ("items").
-- All application access goes through the Supabase service-role key from
-- trusted server code (Route Handlers / Server Actions) -- the anon key is
-- never used by this app. RLS is still enabled with deny-all policies as
-- defense in depth in case the anon/authenticated roles are ever queried
-- directly; service_role bypasses RLS regardless.

create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  image text,
  timezone text not null default 'Australia/Brisbane',
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null,
  color text not null default 'slate',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  title text not null,
  notes text,
  period_type text not null check (period_type in ('day', 'week', 'month', 'quarter', 'year')),
  period_start date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rolled_over', 'archived')),
  is_focus boolean not null default false,
  sort_order integer not null default 0,
  rolled_over_from_id uuid references items(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_user_period_idx on items (user_id, period_type, period_start);
create index if not exists items_user_focus_idx on items (user_id) where is_focus;
create index if not exists items_rollover_scan_idx on items (status, period_type, period_start) where status = 'pending';

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists items_set_updated_at on items;
create trigger items_set_updated_at
  before update on items
  for each row
  execute function set_updated_at();

alter table app_users enable row level security;
alter table categories enable row level security;
alter table items enable row level security;

-- No policies are defined for anon/authenticated roles, which means access
-- is denied by default for those roles. Only service_role (used exclusively
-- by server-side code) can read/write, since it bypasses RLS entirely.
