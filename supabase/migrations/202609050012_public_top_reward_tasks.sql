-- Safe public preview for the landing/dashboard: only five non-sensitive active task fields.
create or replace function public.public_list_top_tasks(p_limit integer default 5)
returns table(id bigint, title text, category text, reward integer, target integer, completed integer)
language sql security definer set search_path = public as $$
  select t.id, t.title, t.category, t.reward, t.target, t.completed
  from public.tasks t
  where t.status = 'active'
    and t.completed < t.target
    and (t.deadline is null or t.deadline > now())
  order by t.reward desc, t.created_at desc
  limit greatest(1, least(coalesce(p_limit, 5), 5));
$$;
revoke all on function public.public_list_top_tasks(integer) from public;
grant execute on function public.public_list_top_tasks(integer) to anon, authenticated;
