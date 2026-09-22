-- Attribute paid-social visits through the public-comment interview and the
-- 2026-10-03 event without exposing answers or email addresses to analytics.

alter table public.public_comment_sessions
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists ad_theme text,
  add column if not exists arrived_at timestamptz,
  add column if not exists funnel_completion_mode text
    check (funnel_completion_mode in ('simple', 'detailed'));

create table public.public_comment_funnel_visits (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  session_id uuid unique references public.public_comment_sessions(id) on delete set null,
  campaign_id uuid references public.public_comment_campaigns(id) on delete set null,
  journey_type text not null check (journey_type in ('interview', 'event_direct')),
  ad_theme text not null,
  landing_path text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  short_link_opened_at timestamptz,
  arrived_at timestamptz,
  interview_started_at timestamptz,
  core_completed_at timestamptz,
  checkpoint_choice text check (checkpoint_choice in ('simple', 'detailed')),
  google_claimed_at timestamptz,
  interview_completed_at timestamptz,
  completion_mode text check (completion_mode in ('simple', 'detailed')),
  event_invitation_accepted_at timestamptz,
  event_invitation_delivery_status text
    check (event_invitation_delivery_status in (
      'accepted', 'delivered', 'bounced', 'complained', 'suppressed'
    )),
  event_invitation_delivered_at timestamptz,
  event_invitation_clicked_at timestamptz,
  event_signup_link_clicked_at timestamptz,
  event_registered_at timestamptz,
  event_attended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_comment_funnel_visits_campaign_idx
  on public.public_comment_funnel_visits
  (utm_campaign, utm_content, ad_theme, arrived_at desc);
create index public_comment_funnel_visits_session_idx
  on public.public_comment_funnel_visits (session_id);

create trigger update_public_comment_funnel_visits_updated_at
  before update on public.public_comment_funnel_visits
  for each row execute function public.update_updated_at_column();

alter table public.public_comment_funnel_visits enable row level security;
revoke all on public.public_comment_funnel_visits from anon, authenticated;
grant all on public.public_comment_funnel_visits to service_role;

create table public.public_comment_ad_daily_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null,
  utm_source text not null default 'instagram',
  utm_campaign text not null,
  utm_content text not null,
  ad_theme text not null,
  impressions integer not null default 0 check (impressions >= 0),
  link_clicks integer not null default 0 check (link_clicks >= 0),
  spend_yen integer not null default 0 check (spend_yen >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stat_date, utm_source, utm_campaign, utm_content, ad_theme)
);

create trigger update_public_comment_ad_daily_stats_updated_at
  before update on public.public_comment_ad_daily_stats
  for each row execute function public.update_updated_at_column();

alter table public.public_comment_ad_daily_stats enable row level security;
revoke all on public.public_comment_ad_daily_stats from anon, authenticated;
grant all on public.public_comment_ad_daily_stats to service_role;

create table public.public_comment_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  funnel_visit_id uuid references public.public_comment_funnel_visits(id) on delete set null,
  email text not null,
  email_normalized text not null,
  attendee_name text not null,
  interests text[] not null default '{}',
  agreement_version text not null,
  note text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  ad_theme text,
  registered_at timestamptz not null default now(),
  last_submitted_at timestamptz not null default now(),
  attended_at timestamptz,
  attendance_recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index public_comment_event_registration_email_idx
  on public.public_comment_event_registrations (event_slug, email_normalized);
create index public_comment_event_registration_visit_idx
  on public.public_comment_event_registrations (funnel_visit_id);

create trigger update_public_comment_event_registrations_updated_at
  before update on public.public_comment_event_registrations
  for each row execute function public.update_updated_at_column();

alter table public.public_comment_event_registrations enable row level security;
revoke all on public.public_comment_event_registrations from anon, authenticated;
grant all on public.public_comment_event_registrations to service_role;

alter table public.public_comment_event_invitations
  add column if not exists click_token uuid not null default gen_random_uuid(),
  add column if not exists delivery_status text
    check (delivery_status in ('accepted', 'delivered', 'bounced', 'complained', 'suppressed')),
  add column if not exists delivered_at timestamptz;

create unique index public_comment_event_invitation_click_token_idx
  on public.public_comment_event_invitations (click_token);
create index public_comment_event_invitation_provider_idx
  on public.public_comment_event_invitations (provider_id)
  where provider_id is not null;

create or replace function public.guard_public_comment_event_invitation_snapshot()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.session_id, new.recipient, new.subject, new.body, new.html,
    new.consent_version, new.idempotency_key, new.click_token)
    is distinct from row(old.session_id, old.recipient, old.subject, old.body, old.html,
      old.consent_version, old.idempotency_key, old.click_token)
    or (old.sender is not null and new.sender is distinct from old.sender) then
    raise exception 'public_comment_event_invitation_immutable';
  end if;
  return new;
end;
$$;

create or replace function public.guard_public_comment_completed_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.completed_at is not null and row(new.completed_at, new.user_id, new.campaign_id,
    new.receipt_opt_in, new.consent_version, new.event_invitation_opt_in,
    new.event_invitation_consent_version, new.consented_at,
    new.utm_source, new.utm_medium, new.utm_campaign, new.utm_content,
    new.ad_theme, new.arrived_at, new.funnel_completion_mode) is distinct from
    row(old.completed_at, old.user_id, old.campaign_id, old.receipt_opt_in,
      old.consent_version, old.event_invitation_opt_in,
      old.event_invitation_consent_version, old.consented_at,
      old.utm_source, old.utm_medium, old.utm_campaign, old.utm_content,
      old.ad_theme, old.arrived_at, old.funnel_completion_mode) then
    raise exception 'public_comment_completed';
  end if;
  return new;
end;
$$;

create or replace function public.start_public_comment_funnel_session(
  p_session_id uuid,
  p_campaign_id uuid,
  p_public_token uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_visit public.public_comment_funnel_visits%rowtype;
  v_campaign public.public_comment_campaigns%rowtype;
begin
  select * into v_campaign from public.public_comment_campaigns
    where id = p_campaign_id;
  if not found then raise exception 'public_comment_campaign_not_found'; end if;

  select * into v_visit from public.public_comment_funnel_visits
    where session_id = p_session_id for update;

  if not found and p_public_token is not null then
    select * into v_visit from public.public_comment_funnel_visits
      where public_token = p_public_token and journey_type = 'interview'
        and session_id is null
      for update;
    if found then
      update public.public_comment_funnel_visits set
        session_id = p_session_id,
        campaign_id = p_campaign_id,
        interview_started_at = coalesce(interview_started_at, now())
      where id = v_visit.id returning * into v_visit;
    end if;
  end if;

  if not found then
    insert into public.public_comment_funnel_visits (
      session_id, campaign_id, journey_type, ad_theme, landing_path,
      arrived_at, interview_started_at
    ) values (
      p_session_id, p_campaign_id, 'interview', v_campaign.slug,
      '/public-comment/' || replace(v_campaign.slug, '-2026', ''), now(), now()
    ) returning * into v_visit;
  else
    update public.public_comment_funnel_visits set
      campaign_id = p_campaign_id,
      interview_started_at = coalesce(interview_started_at, now())
    where id = v_visit.id returning * into v_visit;
  end if;

  update public.public_comment_sessions set
    utm_source = v_visit.utm_source,
    utm_medium = v_visit.utm_medium,
    utm_campaign = v_visit.utm_campaign,
    utm_content = v_visit.utm_content,
    ad_theme = v_visit.ad_theme,
    arrived_at = v_visit.arrived_at
  where id = p_session_id and completed_at is null;

  return v_visit.public_token;
end;
$$;

create or replace function public.register_public_comment_event(
  p_public_token uuid,
  p_event_slug text,
  p_email text,
  p_attendee_name text,
  p_interests text[],
  p_agreement_version text,
  p_note text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_visit public.public_comment_funnel_visits%rowtype;
  v_registration public.public_comment_event_registrations%rowtype;
  v_email text := lower(btrim(p_email));
begin
  if p_event_slug is distinct from 'youth-dialogue-2026-10-03'
    or v_email = '' or btrim(p_attendee_name) = ''
    or coalesce(array_length(p_interests, 1), 0) = 0
    or p_agreement_version is distinct from '2026-09-22-v1' then
    raise exception 'public_comment_event_registration_invalid';
  end if;

  select * into v_visit from public.public_comment_funnel_visits
    where public_token = p_public_token for update;
  if not found then raise exception 'public_comment_funnel_visit_not_found'; end if;

  insert into public.public_comment_event_registrations (
    event_slug, funnel_visit_id, email, email_normalized, attendee_name,
    interests, agreement_version, note, utm_source, utm_campaign,
    utm_content, ad_theme
  ) values (
    p_event_slug, v_visit.id, btrim(p_email), v_email, btrim(p_attendee_name),
    p_interests, p_agreement_version, nullif(btrim(p_note), ''),
    v_visit.utm_source, v_visit.utm_campaign, v_visit.utm_content,
    v_visit.ad_theme
  )
  on conflict (event_slug, email_normalized) do update set
    last_submitted_at = now(),
    attendee_name = excluded.attendee_name,
    interests = excluded.interests,
    agreement_version = excluded.agreement_version,
    note = excluded.note
  returning * into v_registration;

  update public.public_comment_funnel_visits set
    event_registered_at = coalesce(event_registered_at, v_registration.registered_at)
  where id = v_registration.funnel_visit_id;

  return v_registration.id;
end;
$$;

create or replace function public.set_public_comment_event_attendance(
  p_registration_id uuid,
  p_attended boolean,
  p_recorded_by uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_visit_id uuid;
  v_attended_at timestamptz := case when p_attended then now() else null end;
begin
  update public.public_comment_event_registrations set
    attended_at = v_attended_at,
    attendance_recorded_by = case when p_attended then p_recorded_by else null end
  where id = p_registration_id
  returning funnel_visit_id into v_visit_id;
  if not found then raise exception 'public_comment_event_registration_not_found'; end if;

  update public.public_comment_funnel_visits set
    event_attended_at = v_attended_at
  where id = v_visit_id;
end;
$$;

create or replace function public.sync_public_comment_event_invitation_funnel()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.public_comment_funnel_visits set
    event_invitation_accepted_at = case
      when new.status = 'accepted' then coalesce(event_invitation_accepted_at, new.accepted_at, now())
      else event_invitation_accepted_at
    end,
    event_invitation_delivery_status = coalesce(new.delivery_status,
      case when new.status = 'accepted' then 'accepted' else null end,
      event_invitation_delivery_status),
    event_invitation_delivered_at = coalesce(event_invitation_delivered_at, new.delivered_at)
  where session_id = new.session_id;
  return new;
end;
$$;

drop trigger if exists public_comment_event_invitation_funnel_sync
  on public.public_comment_event_invitations;
create trigger public_comment_event_invitation_funnel_sync
  after insert or update of status, accepted_at, delivery_status, delivered_at
  on public.public_comment_event_invitations
  for each row execute function public.sync_public_comment_event_invitation_funnel();

-- Existing interview sessions remain visible in the new funnel. Their first
-- page-load time is unknown, so started_at is used only as a historical proxy.
insert into public.public_comment_funnel_visits (
  session_id, campaign_id, journey_type, ad_theme, landing_path, arrived_at,
  interview_started_at, core_completed_at, checkpoint_choice,
  interview_completed_at, completion_mode, event_invitation_accepted_at,
  event_invitation_delivery_status
)
select
  s.id, s.campaign_id, 'interview', c.slug,
  '/public-comment/' || replace(c.slug, '-2026', ''), s.started_at, s.started_at,
  case when s.interview_state->>'checkpoint' = 'after_core'
      or s.interview_state->>'journey' = 'detail'
      or s.interview_state->>'phase' = 'done' then s.updated_at else null end,
  case when s.interview_state->>'completionMode' in ('simple', 'detailed')
    then s.interview_state->>'completionMode' else null end,
  s.completed_at,
  case when s.interview_state->>'completionMode' in ('simple', 'detailed')
    then s.interview_state->>'completionMode' else null end,
  i.accepted_at,
  case when i.status = 'accepted' then 'accepted' else null end
from public.public_comment_sessions s
join public.public_comment_campaigns c on c.id = s.campaign_id
left join public.public_comment_event_invitations i on i.session_id = s.id
on conflict (session_id) do nothing;

-- Replace the event-enabled completion RPC so each new invitation receives a
-- private click token embedded in its immutable email snapshot.
drop function if exists public.complete_public_comment_session_with_event_invitation(
  uuid, uuid, boolean, boolean, boolean, text, text, text, text, text
);

create function public.complete_public_comment_session_with_event_invitation(
  p_session_id uuid,
  p_user_id uuid,
  p_publication_requested boolean,
  p_receipt_opt_in boolean,
  p_event_invitation_opt_in boolean,
  p_consent_version text,
  p_event_invitation_consent_version text default null,
  p_event_subject text default null,
  p_event_body text default null,
  p_event_html text default null,
  p_event_click_token uuid default null
) returns text language plpgsql security definer set search_path = '' as $$
declare
  v_session public.public_comment_sessions%rowtype;
  v_campaign public.public_comment_campaigns%rowtype;
  v_draft public.public_comment_drafts%rowtype;
  v_email text;
  v_conversation jsonb;
  v_transcript text;
  v_status text;
  v_completion_mode text;
begin
  select * into v_session from public.public_comment_sessions
    where id = p_session_id and user_id = p_user_id for update;
  if not found then raise exception 'public_comment_not_found'; end if;
  if v_session.completed_at is not null then return v_session.publication_status; end if;
  if p_consent_version not in (
      '2026-09-16-receipt-v1',
      '2026-09-18-late-google-auth-v1',
      '2026-09-20-admin-private-review-v1'
    )
    or p_receipt_opt_in is null
    or p_event_invitation_opt_in is null
    or p_publication_requested is null then
    raise exception 'public_comment_invalid_consent';
  end if;
  if p_event_invitation_opt_in and (
    p_event_invitation_consent_version is distinct from '2026-09-22-event-funnel-v1'
    or nullif(btrim(p_event_subject), '') is null
    or nullif(btrim(p_event_body), '') is null
    or nullif(btrim(p_event_html), '') is null
    or p_event_click_token is null
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
  v_completion_mode := case
    when v_session.interview_state->>'completionMode' in ('simple', 'detailed')
      then v_session.interview_state->>'completionMode'
    else null
  end;
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
    end,
    funnel_completion_mode = v_completion_mode
    where id = p_session_id;

  update public.public_comment_funnel_visits set
    interview_completed_at = coalesce(interview_completed_at, now()),
    completion_mode = coalesce(completion_mode, v_completion_mode),
    checkpoint_choice = coalesce(checkpoint_choice, v_completion_mode)
    where session_id = p_session_id;

  if p_receipt_opt_in or p_event_invitation_opt_in then
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
      failure_code, idempotency_key, click_token
    ) values (
      p_session_id, nullif(v_email, ''), p_event_subject, p_event_body, p_event_html,
      p_event_invitation_consent_version,
      case when nullif(v_email, '') is null then 'needs_review' else 'pending' end,
      case when nullif(v_email, '') is null then 'unverified_email' else null end,
      'public-comment-event-invitation/' || p_session_id::text,
      p_event_click_token
    ) on conflict (session_id) do nothing;
  end if;
  return v_status;
end;
$$;

revoke all on function public.start_public_comment_funnel_session(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.register_public_comment_event(uuid, text, text, text, text[], text, text)
  from public, anon, authenticated;
revoke all on function public.set_public_comment_event_attendance(uuid, boolean, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_public_comment_session_with_event_invitation(
  uuid, uuid, boolean, boolean, boolean, text, text, text, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.sync_public_comment_event_invitation_funnel()
  from public, anon, authenticated;

grant execute on function public.start_public_comment_funnel_session(uuid, uuid, uuid)
  to service_role;
grant execute on function public.register_public_comment_event(uuid, text, text, text, text[], text, text)
  to service_role;
grant execute on function public.set_public_comment_event_attendance(uuid, boolean, uuid)
  to service_role;
grant execute on function public.complete_public_comment_session_with_event_invitation(
  uuid, uuid, boolean, boolean, boolean, text, text, text, text, text, uuid
) to service_role;
