DELETE FROM public.bills_tags
WHERE tag_id IN (
  SELECT id
  FROM public.tags
  WHERE label IN (
    '学びの多様化学校',
    '学校給食',
    '条例',
    '陳情',
    '保護者負担'
  )
);

DELETE FROM public.tags
WHERE label IN (
  '学びの多様化学校',
  '学校給食',
  '条例',
  '陳情',
  '保護者負担'
);
