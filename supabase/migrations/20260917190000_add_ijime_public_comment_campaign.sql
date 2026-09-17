insert into public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
values (
  'ijime-ordinance-2026',
  '世田谷区いじめの予防及び解消を実現するための子どもの学びと育ちを支える条例（素案）に関する意見募集',
  '2026-10-08 23:59:59+09',
  'https://www.city.setagaya.lg.jp/02251/35468.html',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  submission_deadline = excluded.submission_deadline,
  official_url = excluded.official_url,
  status = excluded.status,
  updated_at = now();
