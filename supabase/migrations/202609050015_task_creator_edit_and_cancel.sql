-- Task-owner controls: edit task details and safely cancel an unfinished task.
-- Run this file in the Supabase SQL Editor after migration 014.

create or replace function public.update_own_task(
  p_task_id bigint,
  p_title text,
  p_instructions text,
  p_category text,
  p_task_url text,
  p_deadline timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_title text := left(trim(coalesce(p_title, '')), 120);
  v_instructions text := left(trim(coalesce(p_instructions, '')), 4000);
  v_category text := left(trim(coalesce(p_category, 'General')), 60);
begin
  perform public.require_active_account();
  if p_task_url !~* '^https?://[^[:space:]]+$' then
    raise exception 'A valid http or https reference URL is required';
  end if;
  if v_title = '' or v_instructions = '' then
    raise exception 'A task title and instructions are required';
  end if;
  if p_deadline is not null and p_deadline <= now() then
    raise exception 'Deadline must be in the future';
  end if;
  if exists (
    select 1 from public.submissions
    where task_id = p_task_id and status = 'pending'
  ) then
    raise exception 'Review pending proof submissions before editing this task';
  end if;

  update public.tasks
  set title = v_title,
      instructions = v_instructions,
      category = v_category,
      task_url = trim(p_task_url),
      bilibili_url = trim(p_task_url),
      deadline = p_deadline
  where id = p_task_id and creator_id = v_user_id and status = 'active';

  if not found then
    raise exception 'Only an active task created by you can be edited';
  end if;
end;
$$;

create or replace function public.cancel_own_task(p_task_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_refund bigint;
begin
  perform public.require_active_account();
  select * into v_task
  from public.tasks
  where id = p_task_id and creator_id = v_user_id
  for update;

  if not found or v_task.status <> 'active' then
    raise exception 'Only an active task created by you can be cancelled';
  end if;
  if exists (
    select 1 from public.submissions
    where task_id = v_task.id and status = 'pending'
  ) then
    raise exception 'Review pending proof submissions before cancelling this task';
  end if;

  v_refund := greatest(v_task.target - v_task.completed, 0)::bigint * v_task.reward::bigint;
  update public.tasks set status = 'cancelled' where id = v_task.id;
  if v_refund > 0 then
    update public.profiles set coins = coins + v_refund where id = v_user_id;
    insert into public.transactions(user_id, amount, type, reference_id, description)
    values (v_user_id, v_refund, 'task_cancelled_refund', v_task.id::text,
      'Refund for cancelled task: ' || coalesce(v_task.title, 'Task #' || v_task.id));
  end if;
  return v_refund;
end;
$$;

revoke all on function public.update_own_task(bigint, text, text, text, text, timestamptz) from public;
revoke all on function public.cancel_own_task(bigint) from public;
grant execute on function public.update_own_task(bigint, text, text, text, text, timestamptz) to authenticated;
grant execute on function public.cancel_own_task(bigint) to authenticated;
