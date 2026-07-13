create table if not exists public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references public.bills(id) on delete set null,
  category text not null default 'content_issue'
    check (
      category in (
        'content_issue',
        'broken_link',
        'display_issue',
        'other'
      )
    ),
  message text not null,
  contact_name text,
  contact_email text,
  page_url text,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'resolved')),
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists issue_reports_created_at_idx
  on public.issue_reports (created_at desc);

create index if not exists issue_reports_bill_created_at_idx
  on public.issue_reports (bill_id, created_at desc)
  where bill_id is not null;

create index if not exists issue_reports_status_created_at_idx
  on public.issue_reports (status, created_at desc);

alter table public.issue_reports enable row level security;

comment on table public.issue_reports is
  '公開画面の問題報告・問い合わせフォームから送信された内容を管理画面で確認するためのテーブル';
comment on column public.issue_reports.bill_id is
  '対象案件が分かる場合の案件ID';
comment on column public.issue_reports.category is
  '問い合わせ種別';
comment on column public.issue_reports.message is
  'ユーザーが入力した報告本文';
comment on column public.issue_reports.status is
  '管理側の確認状態';
