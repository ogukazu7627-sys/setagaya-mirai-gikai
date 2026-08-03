CREATE OR REPLACE FUNCTION public.archive_reviewed_budget_topic(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fiscal_year SMALLINT;
  v_budget_type TEXT;
  v_category_slug TEXT;
  v_topic JSONB;
  v_dataset_id UUID;
  v_category_id UUID;
  v_topic_id UUID;
  v_archived_relation_count INTEGER;
BEGIN
  IF jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'archived budget topic payload must be a JSON object';
  END IF;

  v_fiscal_year := (p_payload->>'fiscalYear')::SMALLINT;
  v_budget_type := p_payload->>'budgetType';
  v_category_slug := p_payload->>'categorySlug';
  v_topic := p_payload->'topic';

  IF v_fiscal_year IS NULL
    OR v_fiscal_year NOT BETWEEN 2000 AND 2200
    OR btrim(COALESCE(v_budget_type, '')) = ''
    OR btrim(COALESCE(v_category_slug, '')) = ''
    OR jsonb_typeof(v_topic) <> 'object'
    OR (v_topic->>'slug') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR btrim(COALESCE(v_topic->>'name', '')) = ''
    OR btrim(COALESCE(v_topic->>'shortDescription', '')) = ''
    OR (v_topic->>'topicKind') NOT IN (
      'problem',
      'goal',
      'administrative_function'
    )
  THEN
    RAISE EXCEPTION 'archived budget topic payload is invalid';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_fiscal_year::TEXT
        || ':'
        || v_budget_type
        || ':'
        || (v_topic->>'slug'),
      0
    )
  );

  SELECT id
  INTO v_dataset_id
  FROM public.budget_datasets
  WHERE fiscal_year = v_fiscal_year
    AND budget_type = v_budget_type
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'active budget dataset was not found for fiscal year % and type %',
      v_fiscal_year,
      v_budget_type;
  END IF;

  SELECT id
  INTO v_category_id
  FROM public.budget_categories
  WHERE slug = v_category_slug
    AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'published budget category was not found: %',
      v_category_slug;
  END IF;

  INSERT INTO public.budget_topics (
    slug,
    name,
    short_description,
    topic_kind,
    status,
    editorial_note
  )
  VALUES (
    v_topic->>'slug',
    v_topic->>'name',
    v_topic->>'shortDescription',
    v_topic->>'topicKind',
    'archived',
    COALESCE(v_topic->>'editorialNote', '')
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    topic_kind = EXCLUDED.topic_kind,
    status = 'archived',
    editorial_note = EXCLUDED.editorial_note
  RETURNING id INTO v_topic_id;

  INSERT INTO public.budget_topic_categories (
    topic_id,
    category_id,
    relevance_weight,
    is_primary
  )
  VALUES (
    v_topic_id,
    v_category_id,
    1.000,
    TRUE
  )
  ON CONFLICT (topic_id, category_id) DO UPDATE
  SET
    relevance_weight = EXCLUDED.relevance_weight,
    is_primary = EXCLUDED.is_primary;

  UPDATE public.budget_topic_programs
  SET review_status = 'archived'
  WHERE topic_id = v_topic_id
    AND review_status <> 'archived';
  GET DIAGNOSTICS v_archived_relation_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'datasetId', v_dataset_id,
    'categoryId', v_category_id,
    'topicId', v_topic_id,
    'archivedRelationCount', v_archived_relation_count,
    'status', 'archived'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_reviewed_budget_topic(JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.archive_reviewed_budget_topic(JSONB)
  TO service_role;

COMMENT ON FUNCTION public.archive_reviewed_budget_topic(JSONB) IS
  '表示上の編集方針から外れた予算topicと既存関係を、service roleだけが冪等に非公開化する。';
