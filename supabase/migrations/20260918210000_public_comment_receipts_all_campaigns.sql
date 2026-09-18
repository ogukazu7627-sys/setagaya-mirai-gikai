alter table public.public_comment_campaigns
  add column submission_url text;

update public.public_comment_campaigns
set submission_url = case slug
  when 'minpaku-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02245/34014.html'
  when 'ijime-ordinance-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02251/35651.html'
  when 'disability-inclusion-amendment-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02083/34044.html'
  when 'retaining-wall-policy-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02039/33965.html'
  when 'suicide-prevention-plan-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02244/34011.html'
  when 'gender-equality-plan-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02409/34029.html'
  when 'inclusion-plan-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02083/34043.html'
  when 'elderly-care-plan-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02082/34041.html'
  when 'dementia-hope-plan-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/02087/34042.html'
  when 'traffic-safety-plan-2026' then 'https://www.city.setagaya.lg.jp/pub-comment/01420/34009.html'
  else official_url
end;

alter table public.public_comment_campaigns
  alter column submission_url set not null;

create or replace function public.complete_public_comment_session(
  p_session_id uuid, p_user_id uuid, p_publication_requested boolean,
  p_receipt_opt_in boolean, p_consent_version text
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
  -- Historical completions never acquire a receipt, even if a later request opts in.
  if v_session.completed_at is not null then return v_session.publication_status; end if;
  if p_consent_version is distinct from '2026-09-16-receipt-v1'
    or p_receipt_opt_in is null or p_publication_requested is null then
    raise exception 'public_comment_invalid_consent';
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
      p_session_id, nullif(v_email, ''), v_campaign.title || '：インタビューと最終案の控え',
      E'このメールは、AIパブコメインタビューと最終案の控えです。\n世田谷区へ自動提出されていません。提出する場合は、公式サイトで提出方法をご確認ください。\n'
        || v_campaign.submission_url || E'\n\n【最終案】\n'
        || v_draft.final_body || E'\n\n【インタビュー全文】\n' || v_transcript,
      v_conversation, v_draft.final_body, p_consent_version,
      case when nullif(v_email, '') is null then 'needs_review' else 'pending' end,
      case when nullif(v_email, '') is null then 'unverified_email' else null end,
      'public-comment-receipt/' || p_session_id::text
    );
  end if;
  return v_status;
end;
$$;
