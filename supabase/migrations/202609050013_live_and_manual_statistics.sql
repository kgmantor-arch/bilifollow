-- Live dashboard counts plus optional administrator-controlled public overrides.
insert into public.app_settings(key, value) values
  ('site_stats', '{"manual":false,"users":0,"activeTasks":0,"completedTasks":0}'::jsonb)
on conflict(key) do nothing;

create or replace function public.public_site_metrics()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_setting jsonb; v_live_users bigint; v_live_active bigint; v_live_completed bigint;
begin
  select value into v_setting from public.app_settings where key='site_stats';
  select count(*) into v_live_users from public.profiles where status='active';
  select count(*) into v_live_active from public.tasks where status='active' and completed < target and (deadline is null or deadline > now());
  select count(*) into v_live_completed from public.task_completions;
  if coalesce((v_setting->>'manual')::boolean,false) then
    return jsonb_build_object('users',greatest(0,coalesce((v_setting->>'users')::bigint,0)),'activeTasks',greatest(0,coalesce((v_setting->>'activeTasks')::bigint,0)),'completedTasks',greatest(0,coalesce((v_setting->>'completedTasks')::bigint,0)));
  end if;
  return jsonb_build_object('users',v_live_users,'activeTasks',v_live_active,'completedTasks',v_live_completed);
end; $$;

create or replace function public.dashboard_metrics()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_total bigint; v_available bigint:=0; v_completed bigint:=0;
begin
  select count(*) into v_total from public.tasks where status='active' and completed < target and (deadline is null or deadline > now());
  if v_user is not null then
    select count(*) into v_available from public.tasks t
    where t.status='active' and t.completed<t.target and (t.deadline is null or t.deadline>now()) and t.creator_id<>v_user
      and not exists(select 1 from public.submissions s where s.task_id=t.id and s.worker_id=v_user and s.status in ('pending','approved'))
      and not exists(select 1 from public.task_completions c where c.task_id=t.id and c.worker_id=v_user);
    select count(*) into v_completed from public.task_completions where worker_id=v_user;
  else
    v_available:=v_total;
  end if;
  return jsonb_build_object('communityTasks',v_total,'availableTasks',v_available,'userCompleted',v_completed);
end; $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.require_admin();
  if p_key not in ('ads','site_notice','footer_notice','footer','homepage','welcome_offer','site_stats') then raise exception 'Invalid setting key'; end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception 'Invalid setting value'; end if;
  if p_key='welcome_offer' and (coalesce((p_value->>'coins')::bigint,0) < 0 or coalesce((p_value->>'coins')::bigint,0) > 100000) then raise exception 'Welcome coin amount is outside the allowed range'; end if;
  if p_key='site_stats' and (coalesce((p_value->>'users')::bigint,0) < 0 or coalesce((p_value->>'activeTasks')::bigint,0) < 0 or coalesce((p_value->>'completedTasks')::bigint,0) < 0) then raise exception 'Statistics cannot be negative'; end if;
  insert into public.app_settings(key,value,updated_at,updated_by) values(p_key,p_value,now(),auth.uid()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end; $$;

revoke all on function public.public_site_metrics(), public.dashboard_metrics() from public;
grant execute on function public.public_site_metrics(), public.dashboard_metrics() to anon, authenticated;
