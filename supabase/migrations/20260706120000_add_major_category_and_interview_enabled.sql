ALTER TABLE bills
  ADD COLUMN major_category text,
  ADD COLUMN interview_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN bills.major_category IS 'トップページ分類用の大分類。例: 教育🏫';
COMMENT ON COLUMN bills.interview_enabled IS 'AIインタビュー導線を公開表示するかどうか。';
