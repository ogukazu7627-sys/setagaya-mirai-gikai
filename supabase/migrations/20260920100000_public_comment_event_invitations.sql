-- Store a separate, explicit opt-in for the one-time event invitation.
alter table public.public_comment_sessions
  add column if not exists event_invitation_opt_in boolean not null default false,
  add column if not exists event_invitation_consent_version text;

create table if not exists public.public_comment_event_invitations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.public_comment_sessions(id) on delete cascade,
  recipient text,
  sender text,
  subject text not null,
  body text not null,
  html text not null,
  consent_version text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'failed', 'needs_review')),
  idempotency_key text not null unique,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  provider_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.public_comment_event_invitations enable row level security;
revoke all on public.public_comment_event_invitations from anon, authenticated;
grant all on public.public_comment_event_invitations to service_role;

create or replace function public.guard_public_comment_event_invitation_snapshot()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.session_id, new.recipient, new.subject, new.body, new.html,
    new.consent_version, new.idempotency_key)
    is distinct from row(old.session_id, old.recipient, old.subject, old.body, old.html,
      old.consent_version, old.idempotency_key)
    or (old.sender is not null and new.sender is distinct from old.sender) then
    raise exception 'public_comment_event_invitation_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists public_comment_event_invitation_snapshot_frozen
  on public.public_comment_event_invitations;
create trigger public_comment_event_invitation_snapshot_frozen
  before update on public.public_comment_event_invitations
  for each row execute function public.guard_public_comment_event_invitation_snapshot();

create or replace function public.guard_public_comment_completed_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.completed_at is not null and row(new.completed_at, new.user_id, new.campaign_id,
    new.receipt_opt_in, new.consent_version, new.event_invitation_opt_in,
    new.event_invitation_consent_version, new.consented_at) is distinct from
    row(old.completed_at, old.user_id, old.campaign_id, old.receipt_opt_in,
      old.consent_version, old.event_invitation_opt_in,
      old.event_invitation_consent_version, old.consented_at) then
    raise exception 'public_comment_completed';
  end if;
  return new;
end;
$$;

create or replace function public.complete_public_comment_session_with_event_invitation(
  p_session_id uuid,
  p_user_id uuid,
  p_publication_requested boolean,
  p_receipt_opt_in boolean,
  p_event_invitation_opt_in boolean,
  p_consent_version text,
  p_event_invitation_consent_version text,
  p_event_subject text,
  p_event_body text,
  p_event_html text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_session public.public_comment_sessions%rowtype;
  v_campaign public.public_comment_campaigns%rowtype;
  v_draft public.public_comment_drafts%rowtype;
  v_email text;
  v_conversation jsonb;
  v_transcript text;
  v_status text;
begin
  select * into v_session from public.public_comment_sessions
    where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'public_comment_not_found'; end if;
  -- Historical completions never acquire either email, even if a later request opts in.
  if v_session.completed_at is not null then return v_session.publication_status; end if;
  if p_consent_version not in (
      '2026-09-16-receipt-v1',
      '2026-09-18-late-google-auth-v1'
    )
    or p_receipt_opt_in is null
    or p_event_invitation_opt_in is null
    or p_publication_requested is null then
    raise exception 'public_comment_invalid_consent';
  end if;
  if p_event_invitation_opt_in and (
    p_event_invitation_consent_version is distinct from '2026-09-20-event-invitation-v1'
    or nullif(btrim(p_event_subject), '') is null
    or nullif(btrim(p_event_body), '') is null
    or nullif(btrim(p_event_html), '') is null
  ) then
    raise exception 'public_comment_invalid_event_invitation';
  end if;
  select * into v_campaign from public.public_comment_campaigns
    where id = v_session.campaign_id;
  if not found then raise exception 'public_comment_campaign_not_found'; end if;
  select * into v_draft from public.public_comment_drafts where session_id = p_session_id;
  if not found or btrim(v_draft.final_body) = '' then
    raise exception 'public_comment_draft_required';
  end if;
  v_status := case when p_publication_requested then 'pending_review' else 'private' end;
  update public.public_comment_drafts set publication_requested_at =
    case when p_publication_requested then now() else null end where session_id = p_session_id;
  update public.public_comment_sessions set
    completed_at = now(),
    publication_status = v_status,
    receipt_opt_in = p_receipt_opt_in,
    consent_version = p_consent_version,
    event_invitation_opt_in = p_event_invitation_opt_in,
    event_invitation_consent_version = case
      when p_event_invitation_opt_in then p_event_invitation_consent_version
      else null
    end
    where id = p_session_id;

  if p_receipt_opt_in or p_event_invitation_opt_in then
    -- Only the verified Auth record supplies the destination; never a request field.
    select email into v_email from auth.users
      where id = p_user_id and email_confirmed_at is not null and not is_anonymous;
  end if;

  if p_receipt_opt_in then
    select coalesce(jsonb_agg(jsonb_build_object('role', role, 'content', content,
      'stage', stage, 'questionId', question_id) order by created_at, id), '[]'::jsonb),
      coalesce(string_agg(case when role = 'user' then 'あなた' else 'インタビュアー' end
        || E'\n' || content, E'\n\n' order by created_at, id), '')
      into v_conversation, v_transcript from public.public_comment_messages where session_id = p_session_id;
    insert into public.public_comment_receipts (
      session_id, recipient, subject, body, conversation, final_body, consent_version,
      status, failure_code, idempotency_key
    ) values (
      p_session_id, nullif(v_email, ''), v_campaign.title || '：インタビューと最終案の控え',
      E'このメールは、AIパブコメインタビューと最終案の控えです。\n世田谷区へ自動提出されていません。提出する場合は、公式サイトで提出方法をご確認ください。\n'
        || v_campaign.submission_url || E'\n\n【最終案】\n'
        || v_draft.final_body || E'\n\n【インタビュー全文】\n' || v_transcript,
      v_conversation, v_draft.final_body, p_consent_version,
      case when nullif(v_email, '') is null then 'needs_review' else 'pending' end,
      case when nullif(v_email, '') is null then 'unverified_email' else null end,
      'public-comment-receipt/' || p_session_id::text
    ) on conflict (session_id) do nothing;
  end if;

  if p_event_invitation_opt_in then
    insert into public.public_comment_event_invitations (
      session_id, recipient, subject, body, html, consent_version, status,
      failure_code, idempotency_key
    ) values (
      p_session_id, nullif(v_email, ''), p_event_subject, p_event_body, p_event_html,
      p_event_invitation_consent_version,
      case when nullif(v_email, '') is null then 'needs_review' else 'pending' end,
      case when nullif(v_email, '') is null then 'unverified_email' else null end,
      'public-comment-event-invitation/' || p_session_id::text
    ) on conflict (session_id) do nothing;
  end if;
  return v_status;
end;
$$;

create or replace function public.claim_public_comment_event_invitation(
  p_session_id uuid, p_user_id uuid, p_sender text, p_config_failure text default null
) returns setof public.public_comment_event_invitations
language plpgsql security definer set search_path = '' as $$
declare
  v_invitation public.public_comment_event_invitations%rowtype;
begin
  select i.* into v_invitation from public.public_comment_event_invitations i
    join public.public_comment_sessions s on s.id = i.session_id
    where i.session_id = p_session_id and s.user_id = p_user_id for update of i;
  if not found or v_invitation.status in ('accepted', 'needs_review') then return; end if;
  if v_invitation.lease_expires_at > now() then return; end if;
  if v_invitation.attempt_count >= 10
    or v_invitation.first_attempt_at <= now() - interval '23 hours' then
    update public.public_comment_event_invitations set status = 'needs_review',
      lease_token = null, lease_expires_at = null, failure_code = 'retry_window_exhausted'
      where id = v_invitation.id;
    return;
  end if;
  if v_invitation.next_attempt_at > now() then return; end if;
  if p_config_failure is not null or nullif(coalesce(v_invitation.sender, p_sender), '') is null then
    update public.public_comment_event_invitations set status = 'failed',
      failure_code = 'configuration', next_attempt_at = now() + interval '1 minute'
      where id = v_invitation.id;
    return;
  end if;
  return query update public.public_comment_event_invitations set
    sender = coalesce(sender, p_sender), status = 'pending', failure_code = null,
    attempt_count = attempt_count + 1, first_attempt_at = coalesce(first_attempt_at, now()),
    next_attempt_at = now() + interval '1 minute', lease_token = gen_random_uuid(),
    lease_expires_at = now() + interval '2 minutes'
    where id = v_invitation.id returning *;
end;
$$;

create or replace function public.finish_public_comment_event_invitation(
  p_invitation_id uuid, p_lease_token uuid, p_provider_id text default null,
  p_needs_review boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.public_comment_event_invitations set
    status = case when p_provider_id is not null then 'accepted'
      when p_needs_review then 'needs_review' else 'failed' end,
    provider_id = p_provider_id,
    accepted_at = case when p_provider_id is not null then now() else null end,
    failure_code = case when p_provider_id is not null then null else 'provider_failure' end,
    lease_token = null, lease_expires_at = null
    where id = p_invitation_id and lease_token = p_lease_token and status = 'pending';
end;
$$;

revoke all on function public.guard_public_comment_event_invitation_snapshot() from public, anon, authenticated;
revoke all on function public.complete_public_comment_session_with_event_invitation(uuid, uuid, boolean, boolean, boolean, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_public_comment_event_invitation(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.finish_public_comment_event_invitation(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.complete_public_comment_session_with_event_invitation(uuid, uuid, boolean, boolean, boolean, text, text, text, text, text) to service_role;
grant execute on function public.claim_public_comment_event_invitation(uuid, uuid, text, text) to service_role;
grant execute on function public.finish_public_comment_event_invitation(uuid, uuid, text, boolean) to service_role;
