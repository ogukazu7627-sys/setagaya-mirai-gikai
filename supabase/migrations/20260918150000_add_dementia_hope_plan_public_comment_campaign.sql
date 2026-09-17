insert into public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
values (
  'dementia-hope-plan-2026',
  '第3期世田谷区認知症とともに生きる希望計画（素案）の意見募集',
  '2026-09-29 23:59:59+09',
  'https://www.city.setagaya.lg.jp/02087/34867.html',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  submission_deadline = excluded.submission_deadline,
  official_url = excluded.official_url,
  status = excluded.status,
  updated_at = now();
