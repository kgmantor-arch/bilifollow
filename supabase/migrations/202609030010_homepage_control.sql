-- No-code homepage content for the Control Center.

insert into public.app_settings(key, value) values
  ('homepage', '{"badge":"Create • Complete • Reward","title":"Get Community Work Done","description":"Complete legitimate community tasks, earn BiliFollow Coins, and use them to fund useful tasks for the community.","primaryText":"Get Started","primaryUrl":"register.html","secondaryText":"Login","secondaryUrl":"login.html","howTitle":"How BiliFollow Works","howDescription":"Earn points by completing eligible community tasks and spend them to fund a task you create.","ctaTitle":"Ready to Get Started?","ctaDescription":"Create your free BiliFollow account today.","ctaText":"Create Free Account","ctaUrl":"register.html"}'::jsonb)
on conflict (key) do nothing;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_key not in ('ads', 'site_notice', 'footer_notice', 'footer', 'homepage') then raise exception 'Invalid setting key'; end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception 'Invalid setting value'; end if;
  insert into public.app_settings(key, value, updated_at, updated_by) values(p_key, p_value, now(), auth.uid())
  on conflict(key) do update set value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by;
end; $$;
