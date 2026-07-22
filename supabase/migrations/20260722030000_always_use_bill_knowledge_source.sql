-- 試作運用では、案件にナレッジソースがあればAIチャットで常に使う。
-- 既存の下書き・公開済み案件を含めてONにし、今後の新規案件もONを既定値にする。
UPDATE bills
SET use_knowledge_source_in_chat = true
WHERE use_knowledge_source_in_chat IS DISTINCT FROM true;

ALTER TABLE bills
  ALTER COLUMN use_knowledge_source_in_chat SET DEFAULT true;
