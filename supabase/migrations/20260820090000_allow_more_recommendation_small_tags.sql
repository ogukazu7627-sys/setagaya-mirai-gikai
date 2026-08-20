-- 興味分野の選択数を「ちょうど3件」から「3件以上」へ緩和する。
-- 小分類は全84件、大分類は全10件のため、それぞれを上限にする。

ALTER TABLE public.recommendation_profiles
  DROP CONSTRAINT recommendation_profiles_small_tags_count_check;

ALTER TABLE public.recommendation_profiles
  ADD CONSTRAINT recommendation_profiles_small_tags_count_check
    CHECK (cardinality(selected_small_tags) BETWEEN 3 AND 84);

-- 小分類が増えると親の大分類も3件を超えうるため、こちらも上限を引き上げる。
ALTER TABLE public.recommendation_profiles
  DROP CONSTRAINT recommendation_profiles_parent_categories_count_check;

ALTER TABLE public.recommendation_profiles
  ADD CONSTRAINT recommendation_profiles_parent_categories_count_check
    CHECK (cardinality(selected_parent_category_ids) BETWEEN 1 AND 10);
