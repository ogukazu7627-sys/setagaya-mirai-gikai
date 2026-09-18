insert into public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
values (
  'traffic-safety-plan-2026',
  '第12次世田谷区交通安全計画（素案）の意見募集',
  '2026-10-06 23:59:59+09',
  'https://www.city.setagaya.lg.jp/01420/34158.html',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  submission_deadline = excluded.submission_deadline,
  official_url = excluded.official_url,
  status = excluded.status,
  updated_at = now();
