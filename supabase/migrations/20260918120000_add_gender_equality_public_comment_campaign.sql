insert into public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
values (
  'gender-equality-plan-2026',
  '（仮称）世田谷区第三次男女共同参画プラン（素案）の意見募集',
  '2026-10-06 23:59:59+09',
  'https://www.city.setagaya.lg.jp/02409/34851.html',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  submission_deadline = excluded.submission_deadline,
  official_url = excluded.official_url,
  status = excluded.status,
  updated_at = now();
