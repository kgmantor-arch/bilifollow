-- Compatibility fix for legacy databases where profiles.level is text (for example 'LV1').

drop function if exists public.admin_list_members(text, integer);

create function public.admin_list_members(p_search text default '', p_limit integer default 100)
returns table(
  id uuid,
  username text,
  coins bigint,
  level text,
  status text,
  is_admin boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin();
  return query
  select p.id, p.username::text, p.coins::bigint, p.level::text,
    p.status::text, p.is_admin, p.created_at::timestamptz
  from public.profiles p
  where p.username ilike '%' || coalesce(p_search, '') || '%'
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$$;

revoke all on function public.admin_list_members(text, integer) from public;
grant execute on function public.admin_list_members(text, integer) to authenticated;
