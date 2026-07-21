-- Rename legacy Markdown section headings in existing bill content.
-- Only heading lines are updated, so ordinary body text such as
-- 「気になること」 remains unchanged.

UPDATE bill_contents
SET content = regexp_replace(
  content,
  E'(^|\\n)(#{1,6})[\\t 　]*(気になること|考えておきたいこと|意見が分かれるところ)[\\t 　]*(\\r?\\n|$)',
  E'\\1\\2 重要な論点\\4',
  'g'
)
WHERE content ~ E'(^|\\n)#{1,6}[\\t 　]*(気になること|考えておきたいこと|意見が分かれるところ)[\\t 　]*(\\r?\\n|$)';
