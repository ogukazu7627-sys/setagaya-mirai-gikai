alter table public.public_comment_sessions
  add column superseded_at timestamptz,
  add column draft_generation_status text not null default 'idle'
    check (draft_generation_status in ('idle', 'generating', 'ready', 'failed')),
  add column draft_generation_started_at timestamptz,
  add column draft_generation_finished_at timestamptz,
  add column draft_generation_error_code text,
  add column draft_generation_token uuid;

drop index public.public_comment_active_session_idx;
create unique index public_comment_active_session_idx
  on public.public_comment_sessions (campaign_id, user_id)
  where completed_at is null and superseded_at is null;

create table public.public_comment_auth_handoffs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.public_comment_sessions(id) on delete cascade,
  anonymous_user_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index public_comment_auth_handoffs_session_idx
  on public.public_comment_auth_handoffs (session_id, created_at desc);
alter table public.public_comment_auth_handoffs enable row level security;
revoke all on public.public_comment_auth_handoffs from public, anon, authenticated;
grant all on public.public_comment_auth_handoffs to service_role;

create function public.claim_public_comment_draft_generation(
  p_session_id uuid, p_user_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.public_comment_sessions%rowtype;
  v_token uuid;
begin
  select * into v_session from public.public_comment_sessions
    where id = p_session_id and user_id = p_user_id
      and completed_at is null and superseded_at is null
    for update;
  if not found then raise exception 'public_comment_session_not_found'; end if;

  if exists (select 1 from public.public_comment_drafts where session_id = p_session_id) then
    update public.public_comment_sessions set
      draft_generation_status = 'ready', draft_generation_token = null,
      draft_generation_finished_at = coalesce(draft_generation_finished_at, now()),
      draft_generation_error_code = null
    where id = p_session_id;
    return jsonb_build_object('status', 'ready');
  end if;

  if coalesce(v_session.interview_state->>'phase', '') <> 'done' then
    raise exception 'public_comment_interview_incomplete';
  end if;

  if v_session.draft_generation_status = 'generating'
    and v_session.draft_generation_started_at > now() - interval '10 minutes' then
    return jsonb_build_object('status', 'generating');
  end if;

  v_token := gen_random_uuid();
  update public.public_comment_sessions set
    draft_generation_status = 'generating',
    draft_generation_started_at = now(),
    draft_generation_finished_at = null,
    draft_generation_error_code = null,
    draft_generation_token = v_token
  where id = p_session_id;
  return jsonb_build_object('status', 'claimed', 'token', v_token);
end;
$$;

create function public.save_public_comment_generated_draft(
  p_session_id uuid, p_generation_token uuid, p_target_ordinances text[],
  p_ai_body text, p_final_body text, p_source_refs jsonb,
  p_fact_check_notes text[]
) returns public.public_comment_drafts
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.public_comment_sessions%rowtype;
  v_draft public.public_comment_drafts%rowtype;
begin
  select * into v_session from public.public_comment_sessions
    where id = p_session_id and completed_at is null and superseded_at is null
      and draft_generation_status = 'generating'
      and draft_generation_token = p_generation_token
    for update;
  if not found then raise exception 'public_comment_generation_not_claimed'; end if;

  insert into public.public_comment_drafts (
    session_id, target_ordinances, ai_body, final_body, source_refs,
    fact_check_notes
  ) values (
    p_session_id, p_target_ordinances, p_ai_body, p_final_body, p_source_refs,
    p_fact_check_notes
  )
  on conflict (session_id) do update set
    target_ordinances = excluded.target_ordinances,
    ai_body = excluded.ai_body,
    final_body = excluded.final_body,
    source_refs = excluded.source_refs,
    fact_check_notes = excluded.fact_check_notes,
    updated_at = now()
  returning * into v_draft;

  update public.public_comment_sessions set
    draft_generation_status = 'ready',
    draft_generation_finished_at = now(),
    draft_generation_error_code = null,
    draft_generation_token = null
  where id = p_session_id;

  update public.chat_usage_events set user_id = v_session.user_id
    where session_id = p_session_id::text;
  return v_draft;
end;
$$;

create function public.fail_public_comment_draft_generation(
  p_session_id uuid, p_generation_token uuid, p_error_code text
) returns void language sql security definer set search_path = '' as $$
  update public.public_comment_sessions set
    draft_generation_status = 'failed',
    draft_generation_finished_at = now(),
    draft_generation_error_code = left(coalesce(p_error_code, 'generation_failed'), 80),
    draft_generation_token = null
  where id = p_session_id and completed_at is null and superseded_at is null
    and draft_generation_status = 'generating'
    and draft_generation_token = p_generation_token;
$$;

create function public.consume_public_comment_auth_handoff(
  p_token_hash text, p_target_user_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_handoff public.public_comment_auth_handoffs%rowtype;
  v_session public.public_comment_sessions%rowtype;
begin
  if not exists (
    select 1 from auth.users u
    where u.id = p_target_user_id and not u.is_anonymous
      and u.email_confirmed_at is not null
      and exists (
        select 1 from auth.identities i
        where i.user_id = u.id and i.provider = 'google'
      )
  ) then
    raise exception 'public_comment_google_user_required';
  end if;

  select * into v_handoff from public.public_comment_auth_handoffs
    where token_hash = p_token_hash and consumed_at is null
      and expires_at > now()
    for update;
  if not found then raise exception 'public_comment_handoff_invalid'; end if;

  select * into v_session from public.public_comment_sessions
    where id = v_handoff.session_id
      and user_id = v_handoff.anonymous_user_id
      and completed_at is null and superseded_at is null
    for update;
  if not found then raise exception 'public_comment_handoff_session_invalid'; end if;

  update public.public_comment_sessions set superseded_at = now()
    where campaign_id = v_session.campaign_id
      and user_id = p_target_user_id
      and id <> v_session.id
      and completed_at is null and superseded_at is null;

  update public.public_comment_sessions set user_id = p_target_user_id
    where id = v_session.id;
  update public.chat_usage_events set user_id = p_target_user_id
    where session_id = v_session.id::text;
  update public.public_comment_auth_handoffs set consumed_at = now()
    where id = v_handoff.id;
  update public.public_comment_auth_handoffs set consumed_at = now()
    where session_id = v_session.id and consumed_at is null;
  return v_session.id;
end;
$$;

revoke all on function public.claim_public_comment_draft_generation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.save_public_comment_generated_draft(
  uuid, uuid, text[], text, text, jsonb, text[]
) from public, anon, authenticated;
revoke all on function public.fail_public_comment_draft_generation(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.consume_public_comment_auth_handoff(text, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_public_comment_draft_generation(uuid, uuid)
  to service_role;
grant execute on function public.save_public_comment_generated_draft(
  uuid, uuid, text[], text, text, jsonb, text[]
) to service_role;
grant execute on function public.fail_public_comment_draft_generation(uuid, uuid, text)
  to service_role;
grant execute on function public.consume_public_comment_auth_handoff(text, uuid)
  to service_role;
