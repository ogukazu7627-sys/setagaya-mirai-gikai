insert into public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
values (
  'retaining-wall-policy-2026',
  '世田谷区がけ・擁壁等防災対策方針（素案）に関する区民意見募集',
  '2026-10-06 23:59:59+09',
  'https://www.city.setagaya.lg.jp/02039/34282.html',
  'published'
)
on conflict (slug) do update set
  title = excluded.title,
  submission_deadline = excluded.submission_deadline,
  official_url = excluded.official_url,
  status = excluded.status,
  updated_at = now();
