-- 世田谷版の大分類名を利用者向けの表現に更新する。
-- - 文化📚 -> 文化・スポーツ📚
-- - 環境🌿 -> 環境問題🌿

UPDATE bills
SET major_category = '文化・スポーツ📚'
WHERE major_category = '文化📚';

UPDATE tags
SET major_category = '文化・スポーツ📚'
WHERE major_category = '文化📚';

UPDATE bills
SET major_category = '環境問題🌿'
WHERE major_category = '環境🌿';

UPDATE tags
SET major_category = '環境問題🌿'
WHERE major_category = '環境🌿';
