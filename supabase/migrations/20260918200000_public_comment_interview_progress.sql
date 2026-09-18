-- Each campaign selects a mode; a session keeps a snapshot while in progress.
alter table public.public_comment_campaigns
  add column interview_mode public.interview_mode_enum not null default 'loop',
  add column target_audiences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(target_audiences) = 'object');
alter table public.public_comment_sessions
  add column interview_state jsonb,
  add column interview_revision integer not null default 0 check (interview_revision >= 0);

-- Replays return the committed turn even after a lost HTTP response.
create table public.public_comment_interview_turns (
  session_id uuid not null references public.public_comment_sessions(id) on delete cascade,
  request_id uuid not null,
  response jsonb not null,
  primary key (session_id, request_id)
);
alter table public.public_comment_interview_turns enable row level security;

create function public.commit_public_comment_interview_turn(
  p_session_id uuid, p_user_id uuid, p_campaign_id uuid, p_request_id uuid,
  p_expected_revision integer, p_state jsonb,
  p_user_content text default null, p_user_question_id text default null,
  p_assistant_content text default null, p_assistant_question_id text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.public_comment_sessions%rowtype;
  v_message public.public_comment_messages%rowtype;
  v_response jsonb;
  v_time timestamptz := clock_timestamp();
begin
  select * into v_session from public.public_comment_sessions
    where id = p_session_id and user_id = p_user_id and campaign_id = p_campaign_id for update;
  if not found then raise exception 'public_comment_session_not_found'; end if;
  select response into v_response from public.public_comment_interview_turns
    where session_id = p_session_id and request_id = p_request_id;
  if found then return v_response; end if;
  if v_session.completed_at is not null then raise exception 'public_comment_completed'; end if;
  if v_session.interview_revision <> p_expected_revision then raise exception 'public_comment_stale_turn'; end if;
  if p_state is null or p_state->>'version' is distinct from '1'
    or coalesce(p_state->>'mode', '') not in ('loop','bulk','targeted')
    or coalesce(p_state->>'phase', '') not in ('questions','deepening','done')
    then raise exception 'public_comment_invalid_state'; end if;
  if p_user_content is not null then
    insert into public.public_comment_messages(id, session_id, role, stage, question_id, content, created_at)
      values (p_request_id, p_session_id, 'user', 'interview', p_user_question_id, p_user_content, v_time);
  end if;
  if p_assistant_content is not null then
    insert into public.public_comment_messages(session_id, role, stage, question_id, content, created_at)
      values (p_session_id, 'assistant', 'interview', p_assistant_question_id, p_assistant_content, v_time + interval '1 microsecond')
      returning * into v_message;
  end if;
  update public.public_comment_sessions set interview_state = p_state,
    interview_revision = interview_revision + 1 where id = p_session_id;
  v_response := jsonb_build_object(
    'message', case when p_assistant_content is null then null else to_jsonb(v_message) end,
    'state', p_state, 'revision', p_expected_revision + 1,
    'userMessageStored', p_user_content is not null);
  insert into public.public_comment_interview_turns values (p_session_id, p_request_id, v_response);
  return v_response;
end $$;
revoke all on function public.commit_public_comment_interview_turn(uuid,uuid,uuid,uuid,integer,jsonb,text,text,text,text) from public, anon, authenticated;
grant execute on function public.commit_public_comment_interview_turn(uuid,uuid,uuid,uuid,integer,jsonb,text,text,text,text) to service_role;
