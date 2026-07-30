CREATE OR REPLACE FUNCTION public.publish_reviewed_budget_topic(
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
  v_reviewer JSONB;
  v_relations JSONB;
  v_excluded_identity_ids JSONB;
  v_dataset_id UUID;
  v_category_id UUID;
  v_topic_id UUID;
  v_reviewed_by UUID;
  v_reviewed_at TIMESTAMP WITH TIME ZONE;
  v_published_count INTEGER;
  v_removed_count INTEGER;
  v_missing_identity_ids TEXT[];
BEGIN
  IF jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'reviewed budget topic payload must be a JSON object';
  END IF;

  v_fiscal_year := (p_payload->>'fiscalYear')::SMALLINT;
  v_budget_type := p_payload->>'budgetType';
  v_category_slug := p_payload->>'categorySlug';
  v_topic := p_payload->'topic';
  v_reviewer := p_payload->'reviewer';
  v_relations := p_payload->'relations';
  v_excluded_identity_ids :=
    p_payload->'excludedBudgetProgramIdentityIds';

  IF v_fiscal_year IS NULL
    OR v_fiscal_year NOT BETWEEN 2000 AND 2200
    OR btrim(COALESCE(v_budget_type, '')) = ''
    OR btrim(COALESCE(v_category_slug, '')) = ''
    OR jsonb_typeof(v_topic) <> 'object'
    OR jsonb_typeof(v_reviewer) <> 'object'
    OR jsonb_typeof(v_relations) <> 'array'
    OR jsonb_typeof(v_excluded_identity_ids) <> 'array'
  THEN
    RAISE EXCEPTION 'reviewed budget topic payload is invalid';
  END IF;

  IF jsonb_array_length(v_relations) = 0 THEN
    RAISE EXCEPTION 'at least one approved or revised relation is required';
  END IF;

  IF (v_topic->>'slug') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR btrim(COALESCE(v_topic->>'name', '')) = ''
    OR btrim(COALESCE(v_topic->>'shortDescription', '')) = ''
    OR (v_topic->>'topicKind') NOT IN (
      'problem',
      'goal',
      'administrative_function'
    )
  THEN
    RAISE EXCEPTION 'topic metadata is invalid';
  END IF;

  BEGIN
    v_reviewed_by := (v_reviewer->>'id')::UUID;
    v_reviewed_at := (v_reviewer->>'reviewedAt')::TIMESTAMP WITH TIME ZONE;
  EXCEPTION
    WHEN invalid_text_representation OR datetime_field_overflow THEN
      RAISE EXCEPTION 'reviewer id or reviewedAt is invalid';
  END;

  IF v_reviewed_by IS NULL OR v_reviewed_at IS NULL THEN
    RAISE EXCEPTION 'reviewer id and reviewedAt are required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = v_reviewed_by
  ) THEN
    RAISE EXCEPTION 'reviewer does not exist in Supabase Auth';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_relations) AS relation
    WHERE jsonb_typeof(relation) <> 'object'
      OR btrim(COALESCE(relation->>'budgetProgramIdentityId', '')) = ''
      OR (relation->>'relationType') NOT IN (
        'responds_to',
        'supports',
        'maintains',
        'enables'
      )
      OR btrim(COALESCE(relation->>'explanation', '')) = ''
      OR (relation->>'evidenceLevel') NOT IN (
        'B_strong_structural',
        'C_editorial'
      )
      OR jsonb_typeof(relation->'evidenceFields') <> 'object'
      OR (relation->>'reviewDecision') NOT IN ('approve', 'revise')
  ) THEN
    RAISE EXCEPTION 'one or more reviewed relations are invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT relation->>'budgetProgramIdentityId' AS identity_id
      FROM jsonb_array_elements(v_relations) AS relation
      GROUP BY relation->>'budgetProgramIdentityId'
      HAVING count(*) > 1
    ) AS duplicate
  ) THEN
    RAISE EXCEPTION 'reviewed relations contain duplicate identity ids';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_excluded_identity_ids) AS excluded(value)
    WHERE jsonb_typeof(excluded.value) <> 'string'
      OR btrim(excluded.value #>> '{}') = ''
  ) THEN
    RAISE EXCEPTION 'excluded identity ids are invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(v_excluded_identity_ids) AS excluded_identity(
      identity_id
    )
    JOIN jsonb_array_elements(v_relations) AS relation
      ON relation->>'budgetProgramIdentityId' =
        excluded_identity.identity_id
  ) THEN
    RAISE EXCEPTION 'an identity cannot be both published and excluded';
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

  SELECT array_agg(
    relation->>'budgetProgramIdentityId'
    ORDER BY relation->>'budgetProgramIdentityId'
  )
  INTO v_missing_identity_ids
  FROM jsonb_array_elements(v_relations) AS relation
  LEFT JOIN public.budget_program_identities AS identity
    ON identity.dataset_id = v_dataset_id
    AND identity.budget_program_identity_id =
      relation->>'budgetProgramIdentityId'
  WHERE identity.budget_program_identity_id IS NULL;

  IF v_missing_identity_ids IS NOT NULL THEN
    RAISE EXCEPTION
      'reviewed relations reference missing identities: %',
      array_to_string(v_missing_identity_ids, ',');
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
    'published',
    COALESCE(v_topic->>'editorialNote', '')
  )
  ON CONFLICT (slug) DO UPDATE
  SET
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    topic_kind = EXCLUDED.topic_kind,
    status = 'published',
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

  DELETE FROM public.budget_topic_programs AS relation
  WHERE relation.topic_id = v_topic_id
    AND relation.dataset_id = v_dataset_id
    AND relation.budget_program_identity_id IN (
      SELECT excluded_identity.identity_id
      FROM jsonb_array_elements_text(v_excluded_identity_ids)
        AS excluded_identity(
        identity_id
      )
    );
  GET DIAGNOSTICS v_removed_count = ROW_COUNT;

  INSERT INTO public.budget_topic_programs (
    topic_id,
    dataset_id,
    budget_program_identity_id,
    relation_type,
    explanation,
    evidence_level,
    evidence_fields,
    evidence_source_url,
    review_status,
    reviewed_by,
    reviewed_at
  )
  SELECT
    v_topic_id,
    v_dataset_id,
    relation->>'budgetProgramIdentityId',
    relation->>'relationType',
    relation->>'explanation',
    relation->>'evidenceLevel',
    relation->'evidenceFields',
    NULL,
    'published',
    v_reviewed_by,
    v_reviewed_at
  FROM jsonb_array_elements(v_relations) AS relation
  ON CONFLICT (
    topic_id,
    dataset_id,
    budget_program_identity_id
  ) DO UPDATE
  SET
    relation_type = EXCLUDED.relation_type,
    explanation = EXCLUDED.explanation,
    evidence_level = EXCLUDED.evidence_level,
    evidence_fields = EXCLUDED.evidence_fields,
    evidence_source_url = NULL,
    review_status = 'published',
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at;
  GET DIAGNOSTICS v_published_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'datasetId', v_dataset_id,
    'categoryId', v_category_id,
    'topicId', v_topic_id,
    'publishedRelationCount', v_published_count,
    'removedRelationCount', v_removed_count,
    'status', 'published'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_reviewed_budget_topic(JSONB)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.publish_reviewed_budget_topic(JSONB)
  TO service_role;

COMMENT ON FUNCTION public.publish_reviewed_budget_topic(JSONB) IS
  '人間がapprove/reviseした課題と事業の関係だけをactive予算版へ冪等に公開する。';
