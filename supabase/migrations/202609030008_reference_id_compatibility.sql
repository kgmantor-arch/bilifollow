-- Legacy database compatibility: early tables used bigint reference_id,
-- while the secure application records both numeric IDs and UUID/text IDs.

alter table public.transactions
  alter column reference_id type text using reference_id::text;

alter table public.notifications
  alter column reference_id type text using reference_id::text;
