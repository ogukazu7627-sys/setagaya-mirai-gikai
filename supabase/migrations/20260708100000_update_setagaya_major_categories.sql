-- 世田谷版の大分類を10分類へ整理する。
-- 旧分類:
-- - 医療福祉🏥 -> 子育て👶 / 福祉🤝
-- - 行政📋 + 財政💰 -> 行財政🏛️

UPDATE bills
SET major_category = '行財政🏛️'
WHERE major_category IN ('行政📋', '財政💰');

UPDATE tags
SET major_category = '行財政🏛️'
WHERE major_category IN ('行政📋', '財政💰');

UPDATE bills
SET major_category = CASE
  WHEN coalesce(name, '') || ' ' || coalesce(status_note, '') ~
    '(子育て|子ども|こども|児童|保育|学童|若者|妊娠|出産|母子)'
    THEN '子育て👶'
  ELSE '福祉🤝'
END
WHERE major_category = '医療福祉🏥';

UPDATE tags
SET major_category = CASE
  WHEN coalesce(label, '') || ' ' || coalesce(description, '') ~
    '(子育て|子ども|こども|児童|保育|学童|若者|妊娠|出産|母子)'
    THEN '子育て👶'
  ELSE '福祉🤝'
END
WHERE major_category = '医療福祉🏥';
