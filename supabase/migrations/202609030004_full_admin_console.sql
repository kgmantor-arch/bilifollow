-- Full no-code administration controls. Every write is admin-checked server-side.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('submission_approved', 'submission_rejected', 'announcement'));
insert into public.app_settings(key, value) values
  ('ads', '{"enabled":false,"adsenseClient":"","adsenseBannerSlot":"","popupHtml":""}'::jsonb),
  ('site_notice', '{"enabled":false,"title":"","message":""}'::jsonb)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
do $$ declare p text; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_settings'
  loop execute format('drop policy %I on public.app_settings', p); end loop;
end $$;
create policy "settings_public_read" on public.app_settings for select to anon, authenticated using (true);
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;

create or replace function public.require_admin()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Administrator access required';
  end if;
end; $$;

create or replace function public.admin_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'activeTasks', (select count(*) from public.tasks where status = 'active'),
    'pendingSubmissions', (select count(*) from public.submissions where status = 'pending'),
    'openReports', (select count(*) from public.reports where status in ('open', 'reviewing'))
  );
end; $$;

create or replace function public.admin_list_members(p_search text default '', p_limit integer default 100)
returns table(id uuid, username text, coins bigint, level integer, status text, is_admin boolean, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query select p.id, p.username, p.coins, p.level, p.status, p.is_admin, p.created_at
    from public.profiles p
    where p.username ilike '%' || coalesce(p_search, '') || '%'
    order by p.created_at desc limit greatest(1, least(coalesce(p_limit, 100), 200));
end; $$;

create or replace function public.admin_adjust_coins(p_user_id uuid, p_amount bigint, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_new_balance bigint;
begin
  perform public.require_admin();
  if p_amount = 0 or abs(p_amount) > 1000000 then raise exception 'Invalid coin amount'; end if;
  update public.profiles set coins = coins + p_amount where id = p_user_id and coins + p_amount >= 0 returning coins into v_new_balance;
  if not found then raise exception 'Member not found or insufficient balance'; end if;
  insert into public.transactions(user_id, amount, type, reference_id, description)
    values(p_user_id, p_amount, 'admin_adjustment', auth.uid()::text, left(coalesce(nullif(trim(p_note), ''), 'Admin coin adjustment'), 500));
end; $$;

create or replace function public.admin_set_member_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_status not in ('active', 'suspended') then raise exception 'Invalid member status'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot suspend your own administrator account'; end if;
  update public.profiles set status = p_status where id = p_user_id;
  if not found then raise exception 'Member not found'; end if;
end; $$;

create or replace function public.admin_manage_task(p_task_id bigint, p_action text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_action = 'pause' then update public.tasks set status = 'cancelled' where id = p_task_id and status = 'active';
  elsif p_action = 'activate' then update public.tasks set status = 'active' where id = p_task_id and status = 'cancelled' and completed < target;
  else raise exception 'Invalid task action'; end if;
  if not found then raise exception 'Task cannot be changed'; end if;
end; $$;

create or replace function public.admin_list_tasks(p_limit integer default 100)
returns table(id bigint, title text, creator_id uuid, status text, target integer, completed integer, reward integer, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  return query select t.id, t.title, t.creator_id, t.status, t.target, t.completed, t.reward, t.created_at
    from public.tasks t order by t.created_at desc limit greatest(1, least(coalesce(p_limit, 100), 200));
end; $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_key not in ('ads', 'site_notice') then raise exception 'Invalid setting key'; end if;
  if p_key = 'ads' and jsonb_typeof(p_value) <> 'object' then raise exception 'Invalid advertising settings'; end if;
  insert into public.app_settings(key, value, updated_at, updated_by) values(p_key, p_value, now(), auth.uid())
  on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
end; $$;

create or replace function public.admin_send_notice(p_title text, p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  p_title := left(trim(coalesce(p_title, '')), 120); p_message := left(trim(coalesce(p_message, '')), 2000);
  if p_title = '' or p_message = '' then raise exception 'Title and message are required'; end if;
  insert into public.notifications(user_id, type, title, body)
    select id, 'announcement', p_title, p_message from public.profiles where status = 'active';
end; $$;

revoke all on function public.require_admin() from public;
revoke all on function public.admin_dashboard() from public;
revoke all on function public.admin_list_members(text, integer) from public;
revoke all on function public.admin_adjust_coins(uuid, bigint, text) from public;
revoke all on function public.admin_set_member_status(uuid, text) from public;
revoke all on function public.admin_manage_task(bigint, text) from public;
revoke all on function public.admin_list_tasks(integer) from public;
revoke all on function public.admin_set_setting(text, jsonb) from public;
revoke all on function public.admin_send_notice(text, text) from public;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_list_members(text, integer) to authenticated;
grant execute on function public.admin_adjust_coins(uuid, bigint, text) to authenticated;
grant execute on function public.admin_set_member_status(uuid, text) to authenticated;
grant execute on function public.admin_manage_task(bigint, text) to authenticated;
grant execute on function public.admin_list_tasks(integer) to authenticated;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;
grant execute on function public.admin_send_notice(text, text) to authenticated;
