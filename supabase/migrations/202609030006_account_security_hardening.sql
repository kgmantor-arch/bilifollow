-- Final account security hardening. Run once after migrations 001-005.
-- Blocks suspended accounts at database-write time, not only in the dashboard UI.

create or replace function public.require_active_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  ) then
    raise exception 'This account is suspended or unavailable';
  end if;
end;
$$;

-- The existing admin check now also rejects a suspended administrator.
create or replace function public.require_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_active_account();
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Administrator access required';
  end if;
end;
$$;

create or replace function public.enforce_active_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is retained for requests executed from a browser JWT. Service
  -- maintenance calls have no JWT and are not blocked by this request guard.
  if auth.uid() is not null then
    perform public.require_active_account();
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_active_actor_guard on public.profiles;
create trigger profiles_active_actor_guard before update on public.profiles
  for each row execute function public.enforce_active_actor();

drop trigger if exists tasks_active_actor_guard on public.tasks;
create trigger tasks_active_actor_guard before insert or update or delete on public.tasks
  for each row execute function public.enforce_active_actor();

drop trigger if exists submissions_active_actor_guard on public.submissions;
create trigger submissions_active_actor_guard before insert or update or delete on public.submissions
  for each row execute function public.enforce_active_actor();

drop trigger if exists transactions_active_actor_guard on public.transactions;
create trigger transactions_active_actor_guard before insert or update or delete on public.transactions
  for each row execute function public.enforce_active_actor();

drop trigger if exists completions_active_actor_guard on public.task_completions;
create trigger completions_active_actor_guard before insert or update or delete on public.task_completions
  for each row execute function public.enforce_active_actor();

drop trigger if exists notifications_active_actor_guard on public.notifications;
create trigger notifications_active_actor_guard before insert or update or delete on public.notifications
  for each row execute function public.enforce_active_actor();

drop trigger if exists reports_active_actor_guard on public.reports;
create trigger reports_active_actor_guard before insert or update or delete on public.reports
  for each row execute function public.enforce_active_actor();

revoke all on function public.require_active_account() from public;
revoke all on function public.enforce_active_actor() from public;
