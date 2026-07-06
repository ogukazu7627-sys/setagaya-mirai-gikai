ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS major_category text;

UPDATE tags
SET major_category = '教育🏫'
WHERE major_category IS NULL;

ALTER TABLE tags
  ALTER COLUMN major_category SET NOT NULL;

COMMENT ON COLUMN tags.major_category IS '小分類タグが所属する世田谷区議会版の大分類。例: 教育🏫';
