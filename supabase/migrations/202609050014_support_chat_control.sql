-- Allow only administrators to manage the Tawk.to connection from Control Center.
create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.require_admin();
  if p_key not in ('ads','site_notice','footer_notice','footer','homepage','welcome_offer','site_stats','support_chat') then
    raise exception 'Invalid setting key';
  end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception 'Invalid setting value'; end if;
  if p_key='welcome_offer' and (coalesce((p_value->>'coins')::bigint,0) < 0 or coalesce((p_value->>'coins')::bigint,0) > 100000) then
    raise exception 'Welcome coin amount is outside the allowed range';
  end if;
  if p_key='site_stats' and (coalesce((p_value->>'users')::bigint,0) < 0 or coalesce((p_value->>'activeTasks')::bigint,0) < 0 or coalesce((p_value->>'completedTasks')::bigint,0) < 0) then
    raise exception 'Statistics cannot be negative';
  end if;
  if p_key='support_chat' and coalesce(p_value->>'embedUrl','') <> '' and p_value->>'embedUrl' !~ '^https://embed\.tawk\.to/[A-Za-z0-9_/-]+$' then
    raise exception 'Invalid Tawk.to embed URL';
  end if;
  insert into public.app_settings(key,value,updated_at,updated_by)
  values(p_key,p_value,now(),auth.uid())
  on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end; $$;

-- Default to disabled, matching the administrator's current choice.
insert into public.app_settings(key,value)
values ('support_chat','{"enabled":false,"embedUrl":""}'::jsonb)
on conflict (key) do nothing;

revoke all on function public.admin_set_setting(text,jsonb) from public;
grant execute on function public.admin_set_setting(text,jsonb) to authenticated;
