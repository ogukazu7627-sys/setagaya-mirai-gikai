create table public.public_comment_email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  opted_in boolean not null default false,
  consent_version text not null,
  consented_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint public_comment_email_preferences_consent_check
    check (not opted_in or consented_at is not null)
);

comment on table public.public_comment_email_preferences is
  'Optional activity email preference. Resolve recipient email through auth.users; never expose with public comments.';

alter table public.public_comment_email_preferences enable row level security;
