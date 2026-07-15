-- The app-level rollover used to do an INSERT (new copy) then a separate
-- UPDATE (mark the original 'rolled_over') as two round trips. If the cron
-- timed out or errored between them, the original was left 'pending' --
-- so the next day's run picked it up again and copied it *again*, forever.
-- This wraps both steps in one atomic statement: the UPDATE only touches
-- rows still 'pending' (so re-running it for an already-rolled item is a
-- no-op) and the INSERT only fires for rows the UPDATE actually touched.
create or replace function rollover_item(p_item_id uuid, p_next_period_start date)
returns void
language sql
as $$
  with rolled as (
    update items
    set status = 'rolled_over'
    where id = p_item_id and status = 'pending'
    returning id, user_id, category_id, title, notes, period_type, sort_order
  )
  insert into items (user_id, category_id, title, notes, period_type, period_start, rolled_over_from_id, sort_order)
  select user_id, category_id, title, notes, period_type, p_next_period_start, id, sort_order
  from rolled;
$$;

-- Backfill: any item still 'pending' that already has a successor pointing
-- back to it (via rolled_over_from_id) clearly did get rolled over under
-- the old racy code -- the status update just never landed. Mark it
-- 'rolled_over' now so it stops spawning another duplicate on the next run.
update items
set status = 'rolled_over'
where status = 'pending'
  and exists (
    select 1 from items successor where successor.rolled_over_from_id = items.id
  );
