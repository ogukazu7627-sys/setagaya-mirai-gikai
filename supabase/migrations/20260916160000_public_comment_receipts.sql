alter table public.public_comment_sessions
  add column receipt_opt_in boolean not null default false,
  add column consent_version text;

create table public.public_comment_receipts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.public_comment_sessions(id) on delete cascade,
  recipient text,
  sender text,
  subject text not null,
  body text not null,
  conversation jsonb not null,
  final_body text not null,
  consent_version text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'failed', 'needs_review')),
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
alter table public.public_comment_receipts enable row level security;
revoke all on public.public_comment_receipts from anon, authenticated;
grant all on public.public_comment_receipts to service_role;

create function public.guard_public_comment_receipt_snapshot()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.session_id, new.recipient, new.subject, new.body, new.conversation,
    new.final_body, new.consent_version, new.idempotency_key)
    is distinct from row(old.session_id, old.recipient, old.subject, old.body, old.conversation,
      old.final_body, old.consent_version, old.idempotency_key)
    or (old.sender is not null and new.sender is distinct from old.sender) then
    raise exception 'public_comment_receipt_immutable';
  end if;
  return new;
end;
$$;
create trigger public_comment_receipt_snapshot_frozen
  before update on public.public_comment_receipts
  for each row execute function public.guard_public_comment_receipt_snapshot();

create function public.guard_public_comment_completed_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.completed_at is not null and row(new.completed_at, new.user_id, new.campaign_id,
    new.receipt_opt_in, new.consent_version, new.consented_at) is distinct from
    row(old.completed_at, old.user_id, old.campaign_id, old.receipt_opt_in, old.consent_version, old.consented_at) then
    raise exception 'public_comment_completed';
  end if;
  return new;
end;
$$;
create trigger public_comment_completed_session_frozen
  before update on public.public_comment_sessions
  for each row execute function public.guard_public_comment_completed_session();

-- Child writes take the same lock as completion, including requests already in flight.
create function public.guard_public_comment_frozen_content()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_session uuid;
  v_completed timestamptz;
begin
  if tg_op = 'UPDATE' and new.session_id <> old.session_id then
    raise exception 'public_comment_session_immutable' using errcode = 'P0001';
  end if;
  v_session := case when tg_op = 'DELETE' then old.session_id else new.session_id end;
  select completed_at into v_completed from public.public_comment_sessions
    where id = v_session for update;
  if v_completed is not null then
    if tg_table_name = 'public_comment_drafts' and tg_op = 'UPDATE' then
      -- Moderation may set reviewed_at/by; the submitted content stays immutable.
      if row(new.id, new.session_id, new.target_ordinances, new.ai_body, new.final_body,
        new.source_refs, new.fact_check_notes, new.publication_requested_at, new.created_at)
        is not distinct from row(old.id, old.session_id, old.target_ordinances, old.ai_body,
          old.final_body, old.source_refs, old.fact_check_notes, old.publication_requested_at, old.created_at) then
        return new;
      end if;
    end if;
    raise exception 'public_comment_completed' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger public_comment_messages_frozen
  before insert or update or delete on public.public_comment_messages
  for each row execute function public.guard_public_comment_frozen_content();
create trigger public_comment_drafts_frozen
  before insert or update or delete on public.public_comment_drafts
  for each row execute function public.guard_public_comment_frozen_content();

-- All application draft writes lock parent first, matching completion's lock order.
create function public.save_public_comment_draft(
  p_session_id uuid, p_user_id uuid, p_final_body text, p_target_ordinances text[],
  p_ai_body text default null, p_source_refs jsonb default '[]'::jsonb,
  p_fact_check_notes text[] default '{}'
) returns public.public_comment_drafts
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.public_comment_sessions%rowtype;
  v_draft public.public_comment_drafts%rowtype;
begin
  select * into v_session from public.public_comment_sessions
    where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'public_comment_not_found'; end if;
  if v_session.completed_at is not null then raise exception 'public_comment_completed'; end if;
  if p_ai_body is null then
    update public.public_comment_drafts set final_body = p_final_body,
      target_ordinances = p_target_ordinances
      where session_id = p_session_id returning * into v_draft;
    if not found then raise exception 'public_comment_draft_required'; end if;
  else
    insert into public.public_comment_drafts (
      session_id, final_body, target_ordinances, ai_body, source_refs, fact_check_notes
    ) values (p_session_id, p_final_body, p_target_ordinances, p_ai_body, p_source_refs, p_fact_check_notes)
    on conflict (session_id) do update set
      final_body = excluded.final_body, target_ordinances = excluded.target_ordinances,
      ai_body = excluded.ai_body, source_refs = excluded.source_refs,
      fact_check_notes = excluded.fact_check_notes
    returning * into v_draft;
  end if;
  return v_draft;
end;
$$;

create function public.complete_public_comment_session(
  p_session_id uuid, p_user_id uuid, p_publication_requested boolean,
  p_receipt_opt_in boolean, p_consent_version text
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_session public.public_comment_sessions%rowtype;
  v_draft public.public_comment_drafts%rowtype;
  v_email text;
  v_conversation jsonb;
  v_transcript text;
  v_status text;
begin
  select * into v_session from public.public_comment_sessions
    where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'public_comment_not_found'; end if;
  -- Historical completions never acquire a receipt, even if a later request opts in.
  if v_session.completed_at is not null then return v_session.publication_status; end if;
  if p_consent_version is distinct from '2026-09-16-receipt-v1'
    or p_receipt_opt_in is null or p_publication_requested is null then
    raise exception 'public_comment_invalid_consent';
  end if;
  select * into v_draft from public.public_comment_drafts where session_id = p_session_id;
  if not found or btrim(v_draft.final_body) = '' then
    raise exception 'public_comment_draft_required';
  end if;
  v_status := case when p_publication_requested then 'pending_review' else 'private' end;
  update public.public_comment_drafts set publication_requested_at =
    case when p_publication_requested then now() else null end where session_id = p_session_id;
  update public.public_comment_sessions set completed_at = now(), publication_status = v_status,
    receipt_opt_in = p_receipt_opt_in, consent_version = p_consent_version where id = p_session_id;

  if p_receipt_opt_in then
    -- Only the verified Auth record supplies the destination; never a request field.
    select email into v_email from auth.users
      where id = p_user_id and email_confirmed_at is not null and not is_anonymous;
    select coalesce(jsonb_agg(jsonb_build_object('role', role, 'content', content,
      'stage', stage, 'questionId', question_id) order by created_at, id), '[]'::jsonb),
      coalesce(string_agg(case when role = 'user' then 'あなた' else 'インタビュアー' end
        || E'\n' || content, E'\n\n' order by created_at, id), '')
      into v_conversation, v_transcript from public.public_comment_messages where session_id = p_session_id;
    insert into public.public_comment_receipts (
      session_id, recipient, subject, body, conversation, final_body, consent_version,
      status, failure_code, idempotency_key
    ) values (
      p_session_id, nullif(v_email, ''), '民泊パブリックコメント：インタビューと最終案の控え',
      E'このメールは、インタビューと最終案の控えです。\n世田谷区へ自動提出されていません。提出する場合は、公式サイトで提出方法をご確認ください。\n'
        || E'https://www.city.setagaya.lg.jp/pub-comment/02245/34014.html\n\n【最終案】\n'
        || v_draft.final_body || E'\n\n【インタビュー全文】\n' || v_transcript,
      v_conversation, v_draft.final_body, p_consent_version,
      case when nullif(v_email, '') is null then 'needs_review' else 'pending' end,
      case when nullif(v_email, '') is null then 'unverified_email' else null end,
      'minpaku-receipt/' || p_session_id::text
    );
  end if;
  return v_status;
end;
$$;

create function public.claim_public_comment_receipt(
  p_session_id uuid, p_user_id uuid, p_sender text, p_config_failure text default null
) returns setof public.public_comment_receipts
language plpgsql security definer set search_path = '' as $$
declare
  v_receipt public.public_comment_receipts%rowtype;
begin
  select r.* into v_receipt from public.public_comment_receipts r
    join public.public_comment_sessions s on s.id = r.session_id
    where r.session_id = p_session_id and s.user_id = p_user_id for update of r;
  if not found or v_receipt.status in ('accepted', 'needs_review') then return; end if;
  if v_receipt.lease_expires_at > now() then return; end if;
  if v_receipt.attempt_count >= 10 or v_receipt.first_attempt_at <= now() - interval '23 hours' then
    update public.public_comment_receipts set status = 'needs_review', lease_token = null,
      lease_expires_at = null, failure_code = 'retry_window_exhausted' where id = v_receipt.id;
    return;
  end if;
  if v_receipt.next_attempt_at > now() then return; end if;
  if p_config_failure is not null or nullif(coalesce(v_receipt.sender, p_sender), '') is null then
    update public.public_comment_receipts set status = 'failed', failure_code = 'configuration',
      next_attempt_at = now() + interval '1 minute' where id = v_receipt.id;
    return;
  end if;
  return query update public.public_comment_receipts set
    sender = coalesce(sender, p_sender), status = 'pending', failure_code = null,
    attempt_count = attempt_count + 1, first_attempt_at = coalesce(first_attempt_at, now()),
    next_attempt_at = now() + interval '1 minute', lease_token = gen_random_uuid(),
    lease_expires_at = now() + interval '2 minutes'
    where id = v_receipt.id returning *;
end;
$$;

create function public.finish_public_comment_receipt(
  p_receipt_id uuid, p_lease_token uuid, p_provider_id text default null,
  p_needs_review boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.public_comment_receipts set
    status = case when p_provider_id is not null then 'accepted'
      when p_needs_review then 'needs_review' else 'failed' end,
    provider_id = p_provider_id,
    accepted_at = case when p_provider_id is not null then now() else null end,
    failure_code = case when p_provider_id is not null then null else 'provider_failure' end,
    lease_token = null, lease_expires_at = null
    where id = p_receipt_id and lease_token = p_lease_token and status = 'pending';
end;
$$;

revoke all on function public.guard_public_comment_frozen_content() from public, anon, authenticated;
revoke all on function public.guard_public_comment_receipt_snapshot() from public, anon, authenticated;
revoke all on function public.guard_public_comment_completed_session() from public, anon, authenticated;
revoke all on function public.complete_public_comment_session(uuid, uuid, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.claim_public_comment_receipt(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.finish_public_comment_receipt(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.save_public_comment_draft(uuid, uuid, text, text[], text, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.complete_public_comment_session(uuid, uuid, boolean, boolean, text) to service_role;
grant execute on function public.claim_public_comment_receipt(uuid, uuid, text, text) to service_role;
grant execute on function public.finish_public_comment_receipt(uuid, uuid, text, boolean) to service_role;
grant execute on function public.save_public_comment_draft(uuid, uuid, text, text[], text, jsonb, text[]) to service_role;
