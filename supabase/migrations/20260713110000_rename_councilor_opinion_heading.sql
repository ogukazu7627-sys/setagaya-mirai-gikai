-- Rename the old Markdown heading in existing bill content.
-- Extraction still accepts the legacy heading, but updating stored content keeps
-- the admin editor, public page, and structured projection aligned.

UPDATE bill_contents
SET content = replace(
  content,
  '# 議員の意見',
  '# 議員、会派の意見'
)
WHERE content LIKE '%# 議員の意見%';

COMMENT ON TABLE councilor_bill_statements IS '案件Markdownの「議員、会派の意見」から抽出した議員・会派別発言の正規化プロジェクション';
COMMENT ON COLUMN councilor_bill_statements.councilor_name IS 'Markdown見出しから正規化した議員名・会派名';
COMMENT ON COLUMN councilor_bill_statements.raw_heading IS 'Markdown上の議員・会派見出しテキスト';
COMMENT ON COLUMN councilor_bill_statements.party_or_group IS '議員見出し括弧内の会派名など';
COMMENT ON COLUMN councilor_bill_statements.content_md IS '議員・会派見出し配下のMarkdown本文';
COMMENT ON COLUMN councilor_bill_statements.content_text IS '集計・検索補助用のプレーンテキスト本文';
