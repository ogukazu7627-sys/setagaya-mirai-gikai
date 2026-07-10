-- Rename the old Markdown heading in existing bill content.
-- The detail page also normalizes this at render time, but updating stored
-- content keeps the admin editor and future exports aligned.

UPDATE bill_contents
SET content = replace(
  content,
  '# 意見が分かれるところ',
  '# 考えておきたいこと'
)
WHERE content LIKE '%# 意見が分かれるところ%';
