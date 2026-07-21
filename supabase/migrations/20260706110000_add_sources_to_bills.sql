ALTER TABLE bills
  ADD COLUMN sources jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN bills.sources IS '公式資料・出典の配列。title, url, source_type, published_at/accessed_at を持つ。';
