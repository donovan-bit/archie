-- Adds one level of subcategories (e.g. "Business" -> "Clinic admin").
-- Only two levels are supported: a category with parent_id null is
-- top-level; a category with parent_id set is a subcategory of that
-- top-level category. The app enforces this (a subcategory's parent must
-- itself be top-level) -- not encoded as a SQL constraint since that would
-- need a recursive check.

alter table categories
  add column if not exists parent_id uuid references categories(id) on delete cascade;

create index if not exists categories_parent_idx on categories (parent_id);

-- Names only need to be unique among siblings now, not per-user overall,
-- so "Admin" can exist under both Business and Personal.
alter table categories drop constraint if exists categories_user_id_name_key;
create unique index if not exists categories_user_parent_name_idx
  on categories (user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- Backfill: give every existing user's top-level "Business" category the
-- starter subcategories, so accounts created before this migration (not
-- just brand-new ones) get them too. Idempotent -- safe to rerun.
insert into categories (user_id, parent_id, name, color, sort_order)
select business.user_id, business.id, sub.name, business.color, sub.sort_order
from categories business
cross join (
  values ('Archie', 0), ('Clinic business', 1), ('Clinic admin', 2)
) as sub(name, sort_order)
where business.parent_id is null
  and business.name = 'Business'
  and not exists (
    select 1 from categories existing
    where existing.parent_id = business.id and existing.name = sub.name
  );
