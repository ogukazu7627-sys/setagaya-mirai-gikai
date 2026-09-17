insert into public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
values (
  'disability-inclusion-amendment-2026',
  '世田谷区障害理解の促進と地域共生社会の実現をめざす条例の一部改正（素案）の意見募集',
  '2026-10-07 23:59:59+09',
  'https://www.city.setagaya.lg.jp/02083/34329.html',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  submission_deadline = excluded.submission_deadline,
  official_url = excluded.official_url,
  status = excluded.status,
  updated_at = now();
