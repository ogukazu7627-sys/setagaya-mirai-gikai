insert into public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
values (
  'inclusion-plan-2026',
  '次期せたがやインクルージョンプラン-世田谷区障害施策推進計画-（素案）の意見募集',
  '2026-10-07 23:59:59+09',
  'https://www.city.setagaya.lg.jp/02083/34164.html',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  submission_deadline = excluded.submission_deadline,
  official_url = excluded.official_url,
  status = excluded.status,
  updated_at = now();
