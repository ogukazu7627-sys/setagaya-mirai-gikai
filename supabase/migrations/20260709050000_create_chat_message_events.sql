create table if not exists public.chat_message_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id text,
  page_type text not null default 'unknown'
    check (page_type in ('home', 'bill', 'unknown')),
  bill_id uuid references public.bills(id) on delete set null,
  difficulty_level public.difficulty_level_enum,
  message text not null,
  scope_status text not null default 'allowed'
    check (scope_status in ('allowed', 'blocked')),
  block_reason text,
  metadata jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists chat_message_events_user_occurred_at_idx
  on public.chat_message_events (user_id, occurred_at desc);

create index if not exists chat_message_events_bill_occurred_at_idx
  on public.chat_message_events (bill_id, occurred_at desc)
  where bill_id is not null;

create index if not exists chat_message_events_scope_status_idx
  on public.chat_message_events (scope_status, occurred_at desc);

alter table public.chat_message_events enable row level security;

comment on table public.chat_message_events is
  '通常AIチャットでユーザーが送信した質問を保存するテーブル';
comment on column public.chat_message_events.message is
  'ユーザーが送信した質問本文';
comment on column public.chat_message_events.scope_status is
  '質問がチャットの対象範囲内だったかどうか';
comment on column public.chat_message_events.block_reason is
  '範囲外としてブロックした場合の理由';
