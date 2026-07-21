-- Rename category labels embedded in existing Setagaya bill titles.
-- The canonical category values were renamed in 20260710090000; this keeps
-- generated title text aligned with the visible category labels.

UPDATE bills
SET name = replace(
  replace(name, '文化📚', '文化・スポーツ📚'),
  '環境🌿',
  '環境問題🌿'
)
WHERE name LIKE '%文化📚%' OR name LIKE '%環境🌿%';

UPDATE bill_contents
SET title = replace(
  replace(title, '文化📚', '文化・スポーツ📚'),
  '環境🌿',
  '環境問題🌿'
)
WHERE title LIKE '%文化📚%' OR title LIKE '%環境🌿%';
