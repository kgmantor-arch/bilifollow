-- BiliFollow member rewards, private avatars, automatic proof settlement, and audit views.
-- Apply after migrations 001-010 in Supabase SQL Editor.

alter table public.profiles add column if not exists avatar_path text;
alter table public.submissions add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('submission_approved', 'submission_rejected', 'announcement', 'submission_auto_approved', 'welcome_bonus'));

insert into public.app_settings(key, value) values
  ('welcome_offer', '{"enabled":true,"coins":50,"message":"Welcome to BiliFollow! Your 50 free Coins are ready to use."}'::jsonb)
on conflict (key) do nothing;

-- Each avatar stays private. Only its owner can upload/read/delete it; the UI uses a short-lived signed URL.
insert into storage.buckets(id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do update set public = false;
drop policy if exists "avatars_upload_own" on storage.objects;
drop policy if exists "avatars_read_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_upload_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars_read_own" on storage.objects for select to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.update_profile_avatar(p_avatar_path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_avatar_path !~ '^[0-9a-f-]{36}/avatar\.[a-z0-9]{1,5}$'
     or split_part(p_avatar_path, '/', 1) <> auth.uid()::text then
    raise exception 'Invalid avatar file path';
  end if;
  if not exists (select 1 from storage.objects where bucket_id='avatars' and name=p_avatar_path) then
    raise exception 'Uploaded avatar was not found';
  end if;
  update public.profiles set avatar_path=p_avatar_path, updated_at=now() where id=auth.uid();
end; $$;

-- The offer is checked in the user-creation transaction, so the bonus is granted once only.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_offer jsonb; v_enabled boolean := true; v_coins bigint := 50; v_name text;
begin
  select value into v_offer from public.app_settings where key='welcome_offer';
  if v_offer is not null then
    v_enabled := coalesce((v_offer->>'enabled')::boolean, true);
    v_coins := greatest(0, least(coalesce((v_offer->>'coins')::bigint, 50), 100000));
  end if;
  v_name := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), nullif(split_part(new.email, '@', 1), ''), 'user');
  insert into public.profiles(id, username, coins) values(new.id, v_name, case when v_enabled then v_coins else 0 end)
  on conflict(id) do nothing;
  if v_enabled and v_coins > 0 then
    insert into public.transactions(user_id, amount, type, reference_id, description)
    values(new.id, v_coins, 'welcome_bonus', new.id::text, 'New member welcome offer');
    insert into public.notifications(user_id, type, title, body, reference_id)
    values(new.id, 'welcome_bonus', 'Welcome bonus added', 'You received ' || v_coins || ' free Coins.', new.id::text);
  end if;
  return new;
end; $$;

-- Owner review records who approved/rejected a proof for the administrator audit log.
create or replace function public.approve_submission(p_submission_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v_submission public.submissions%rowtype; v_task public.tasks%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_submission from public.submissions where id=p_submission_id for update;
  if not found or v_submission.status <> 'pending' then raise exception 'Submission is not pending'; end if;
  select * into v_task from public.tasks where id=v_submission.task_id for update;
  if not found or v_task.creator_id <> auth.uid() then raise exception 'Only the task creator can review this submission'; end if;
  if v_task.status <> 'active' or v_task.completed >= v_task.target then raise exception 'Task is no longer available'; end if;
  update public.submissions set status='approved', reviewed_at=now(), reviewed_by=auth.uid(), admin_note=null where id=v_submission.id;
  insert into public.task_completions(task_id, worker_id) values(v_task.id, v_submission.worker_id);
  update public.tasks set completed=completed+1, status=case when completed+1 >= target then 'completed' else status end where id=v_task.id;
  update public.profiles set coins=coins+v_task.reward where id=v_submission.worker_id;
  insert into public.transactions(user_id, amount, type, reference_id, description) values(v_submission.worker_id, v_task.reward, 'task_approved', v_submission.id::text, 'Task reward: ' || v_task.title);
  insert into public.notifications(user_id, type, title, body, reference_id) values(v_submission.worker_id, 'submission_approved', 'Submission approved', 'You earned ' || v_task.reward || ' Coins for "' || v_task.title || '".', v_submission.id::text);
end; $$;

create or replace function public.reject_submission(p_submission_id bigint, p_admin_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_submission public.submissions%rowtype; v_title text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_submission from public.submissions where id=p_submission_id for update;
  if not found or v_submission.status <> 'pending' then raise exception 'Submission is not pending'; end if;
  select title into v_title from public.tasks where id=v_submission.task_id and creator_id=auth.uid();
  if not found then raise exception 'Only the task creator can review this submission'; end if;
  update public.submissions set status='rejected', admin_note=left(nullif(trim(p_admin_note),''),1000), reviewed_at=now(), reviewed_by=auth.uid() where id=v_submission.id;
  insert into public.notifications(user_id,type,title,body,reference_id) values(v_submission.worker_id,'submission_rejected','Submission needs changes','Your proof for "' || v_title || '" was rejected. You may submit a new proof.',v_submission.id::text);
end; $$;

-- Runs without a logged-in user.  It is idempotent and only settles pending proofs older than 20 minutes.
create or replace function public.auto_approve_expired_submissions()
returns integer language plpgsql security definer set search_path = public as $$
declare v_submission public.submissions%rowtype; v_task public.tasks%rowtype; v_count integer := 0; v_inserted integer;
begin
  for v_submission in select * from public.submissions where status='pending' and created_at <= now() - interval '20 minutes' order by created_at for update skip locked
  loop
    select * into v_task from public.tasks where id=v_submission.task_id for update;
    if not found or v_task.status <> 'active' or v_task.completed >= v_task.target then continue; end if;
    update public.submissions set status='approved', reviewed_at=now(), reviewed_by=null, admin_note='Automatically approved after 20 minutes without task-owner review' where id=v_submission.id and status='pending';
    if not found then continue; end if;
    insert into public.task_completions(task_id,worker_id) values(v_task.id,v_submission.worker_id) on conflict(task_id,worker_id) do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then continue; end if;
    update public.tasks set completed=completed+1,status=case when completed+1 >= target then 'completed' else status end where id=v_task.id;
    update public.profiles set coins=coins+v_task.reward where id=v_submission.worker_id;
    insert into public.transactions(user_id,amount,type,reference_id,description) values(v_submission.worker_id,v_task.reward,'task_auto_approved',v_submission.id::text,'Automatic reward after 20-minute review window: ' || v_task.title);
    insert into public.notifications(user_id,type,title,body,reference_id) values(v_submission.worker_id,'submission_auto_approved','Proof automatically approved','You earned ' || v_task.reward || ' Coins because the 20-minute review window expired.',v_submission.id::text);
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

create or replace function public.admin_list_activity(p_limit integer default 150)
returns table(kind text, happened_at timestamptz, task_id bigint, submission_id bigint, task_title text, creator text, worker text, reviewer text, amount bigint, detail text)
language plpgsql security definer set search_path=public as $$
begin
  perform public.require_admin();
  return query
  select * from (
    select 'task_created'::text, t.created_at, t.id, null::bigint, t.title, c.username, null::text, null::text, -(t.target::bigint*t.reward::bigint), 'Task funded'::text from public.tasks t join public.profiles c on c.id=t.creator_id
    union all
    select 'proof_' || s.status, s.created_at, t.id, s.id, t.title, c.username, w.username, r.username, case when s.status='approved' then t.reward else 0 end, coalesce(s.admin_note,'') from public.submissions s join public.tasks t on t.id=s.task_id join public.profiles c on c.id=t.creator_id join public.profiles w on w.id=s.worker_id left join public.profiles r on r.id=s.reviewed_by
    union all
    select tr.type, tr.created_at, null::bigint, null::bigint, null::text, null::text, p.username, null::text, tr.amount, coalesce(tr.description,'') from public.transactions tr join public.profiles p on p.id=tr.user_id
  ) activity order by happened_at desc limit greatest(1,least(coalesce(p_limit,150),500));
end; $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.require_admin();
  if p_key not in ('ads','site_notice','footer_notice','footer','homepage','welcome_offer') then raise exception 'Invalid setting key'; end if;
  if jsonb_typeof(p_value) <> 'object' then raise exception 'Invalid setting value'; end if;
  if p_key='welcome_offer' and (coalesce((p_value->>'coins')::bigint,0) < 0 or coalesce((p_value->>'coins')::bigint,0) > 100000) then raise exception 'Welcome coin amount is outside the allowed range'; end if;
  insert into public.app_settings(key,value,updated_at,updated_by) values(p_key,p_value,now(),auth.uid()) on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
end; $$;

revoke all on function public.update_profile_avatar(text), public.auto_approve_expired_submissions(), public.admin_list_activity(integer) from public;
grant execute on function public.update_profile_avatar(text), public.admin_list_activity(integer) to authenticated;

-- Supabase pg_cron invokes the secure function every minute. It cannot double-pay a proof.
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname='bilifollow-auto-approve';
  perform cron.schedule('bilifollow-auto-approve', '* * * * *', 'select public.auto_approve_expired_submissions()');
exception when others then
  raise notice 'Automatic approval function installed, but pg_cron scheduling needs to be enabled in this Supabase project: %', sqlerrm;
end $$;
