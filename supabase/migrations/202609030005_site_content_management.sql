-- No-code public pages and footer content managed by administrators.

insert into public.app_settings(key, value) values
  ('footer_notice', '{"enabled":false,"title":"","message":""}'::jsonb),
  ('footer', '{"copyright":"© 2026 BiliFollow. All rights reserved.","disclaimer":"BiliFollow Coins are internal platform points and are not Bilibili official Coins or Flowers."}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.site_pages (
  slug text primary key check (slug in ('about', 'contact', 'disclaimer')),
  title text not null,
  body text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.site_pages(slug, title, body) values
  ('about', 'About BiliFollow', 'BiliFollow is a community task platform where members can create, complete, and review legitimate tasks using internal platform points.'),
  ('contact', 'Contact Us', 'For support, account questions, or reports, contact the BiliFollow team using the contact method published by the administrator.'),
  ('disclaimer', 'Disclaimer', 'BiliFollow is independent from Bilibili. Internal platform points have no cash value and are not official Bilibili currency, credits, or rewards.')
on conflict (slug) do nothing;

alter table public.site_pages enable row level security;
do $$ declare p text; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'site_pages'
  loop execute format('drop policy %I on public.site_pages', p); end loop;
end $$;
create policy "site_pages_public_read" on public.site_pages for select to anon, authenticated using (true);
revoke all on public.site_pages from anon, authenticated;
grant select on public.site_pages to anon, authenticated;

create or replace function public.admin_save_site_page(p_slug text, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_slug not in ('about', 'contact', 'disclaimer') then raise exception 'Invalid page'; end if;
  p_title := left(trim(coalesce(p_title, '')), 160); p_body := left(trim(coalesce(p_body, '')), 10000);
  if p_title = '' or p_body = '' then raise exception 'Title and content are required'; end if;
  insert into public.site_pages(slug,title,body,updated_at,updated_by) values(p_slug,p_title,p_body,now(),auth.uid())
  on conflict(slug) do update set title=excluded.title, body=excluded.body, updated_at=excluded.updated_at, updated_by=excluded.updated_by;
end; $$;

revoke all on function public.admin_save_site_page(text,text,text) from public;
grant execute on function public.admin_save_site_page(text,text,text) to authenticated;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  if p_key not in ('ads', 'site_notice', 'footer_notice', 'footer') then raise exception 'Invalid setting key'; end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception 'Invalid setting value'; end if;
  insert into public.app_settings(key, value, updated_at, updated_by) values(p_key, p_value, now(), auth.uid())
  on conflict(key) do update set value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by;
end; $$;
