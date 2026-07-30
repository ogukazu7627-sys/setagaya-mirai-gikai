CREATE INDEX budget_topics_published_normalized_search_trgm_idx
  ON public.budget_topics
  USING GIN (
    public.normalize_budget_search_text(name) extensions.gin_trgm_ops
  )
  WHERE status = 'published';

DROP FUNCTION public.search_budget_programs(
  TEXT,
  SMALLINT,
  TEXT,
  BOOLEAN,
  INTEGER,
  INTEGER
);

CREATE FUNCTION public.search_budget_programs(
  p_query TEXT,
  p_fiscal_year SMALLINT DEFAULT NULL,
  p_account_code TEXT DEFAULT NULL,
  p_include_zero_amount BOOLEAN DEFAULT FALSE,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  dataset_id UUID,
  budget_program_identity_id TEXT,
  fiscal_year SMALLINT,
  account_code TEXT,
  account_name TEXT,
  budget_item_key TEXT,
  kan_code TEXT,
  kan_name TEXT,
  kou_code TEXT,
  kou_name TEXT,
  moku_code TEXT,
  moku_name TEXT,
  display_program_name TEXT,
  department_display_name TEXT,
  amount_thousand_yen BIGINT,
  member_group_count INTEGER,
  member_program_count INTEGER,
  related_revenue_count INTEGER,
  has_public_identity_resolution BOOLEAN,
  is_zero_amount BOOLEAN,
  published_topics JSONB,
  score DOUBLE PRECISION,
  matched_field TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_query TEXT := btrim(COALESCE(p_query, ''));
  v_normalized_query TEXT;
BEGIN
  IF char_length(v_query) < 1 OR char_length(v_query) > 100 THEN
    RAISE EXCEPTION 'p_query must be between 1 and 100 characters';
  END IF;
  IF p_page < 1 OR p_page > 1000 THEN
    RAISE EXCEPTION 'p_page must be between 1 and 1000';
  END IF;
  IF p_page_size < 1 OR p_page_size > 50 THEN
    RAISE EXCEPTION 'p_page_size must be between 1 and 50';
  END IF;
  IF p_account_code IS NOT NULL
    AND p_account_code NOT IN (
      'general',
      'national_health_insurance',
      'latter_stage_elderly_healthcare',
      'long_term_care_insurance',
      'school_lunch_fee'
    )
  THEN
    RAISE EXCEPTION 'unsupported p_account_code';
  END IF;

  v_normalized_query := public.normalize_budget_search_text(v_query);
  IF v_normalized_query = '' THEN
    RAISE EXCEPTION 'p_query must contain searchable characters';
  END IF;

  RETURN QUERY
  WITH active_dataset AS MATERIALIZED (
    SELECT dataset.id
    FROM public.budget_datasets AS dataset
    WHERE dataset.status = 'active'
      AND (
        p_fiscal_year IS NULL
        OR dataset.fiscal_year = p_fiscal_year
      )
    ORDER BY
      dataset.fiscal_year DESC,
      dataset.activated_at DESC NULLS LAST,
      dataset.id
    LIMIT 1
  ),
  identity_base AS MATERIALIZED (
    SELECT
      identity.*,
      item.kan_name AS item_kan_name,
      item.kou_name AS item_kou_name,
      item.moku_name AS item_moku_name
    FROM public.budget_program_identities AS identity
    JOIN active_dataset AS dataset ON dataset.id = identity.dataset_id
    JOIN public.budget_items AS item
      ON item.dataset_id = identity.dataset_id
      AND item.budget_item_key = identity.budget_item_key
    WHERE (
        p_account_code IS NULL
        OR identity.account_code = p_account_code
      )
      AND (p_include_zero_amount OR NOT identity.is_zero_amount)
  ),
  published_topic_relations AS MATERIALIZED (
    SELECT
      relation.dataset_id,
      relation.budget_program_identity_id,
      topic.slug,
      topic.name
    FROM public.budget_topic_programs AS relation
    JOIN public.budget_topics AS topic
      ON topic.id = relation.topic_id
      AND topic.status = 'published'
    JOIN identity_base AS identity
      ON identity.dataset_id = relation.dataset_id
      AND identity.budget_program_identity_id
        = relation.budget_program_identity_id
    WHERE relation.review_status = 'published'
  ),
  identity_matches AS (
    SELECT
      identity.dataset_id,
      identity.budget_program_identity_id,
      GREATEST(
        CASE
          WHEN public.normalize_budget_search_text(
            identity.display_program_name
          ) = v_normalized_query THEN 120::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              identity.display_program_name
            ),
            v_normalized_query
          ) > 0 THEN 90
          ELSE extensions.similarity(
            public.normalize_budget_search_text(
              identity.display_program_name
            ),
            v_normalized_query
          ) * 45
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            identity.department_display_name
          ) = v_normalized_query THEN 110::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              identity.department_display_name
            ),
            v_normalized_query
          ) > 0 THEN 82
          ELSE extensions.similarity(
            public.normalize_budget_search_text(
              identity.department_display_name
            ),
            v_normalized_query
          ) * 40
        END
      ) AS score,
      CASE
        WHEN public.normalize_budget_search_text(
          identity.display_program_name
        ) = v_normalized_query THEN 'display_program_name'
        WHEN public.normalize_budget_search_text(
          identity.department_display_name
        ) = v_normalized_query THEN 'department_display_name'
        WHEN strpos(
          public.normalize_budget_search_text(
            identity.display_program_name
          ),
          v_normalized_query
        ) > 0
          THEN 'display_program_name'
        ELSE 'department_display_name'
      END AS matched_field
    FROM identity_base AS identity
    WHERE strpos(
        public.normalize_budget_search_text(
          identity.display_program_name
          || ' '
          || identity.department_display_name
        ),
        v_normalized_query
      ) > 0
      OR extensions.similarity(
        public.normalize_budget_search_text(
          identity.display_program_name
          || ' '
          || identity.department_display_name
        ),
        v_normalized_query
      ) >= 0.22
  ),
  program_matches AS (
    SELECT
      program.dataset_id,
      program.budget_program_identity_id,
      MAX(GREATEST(
        CASE
          WHEN public.normalize_budget_search_text(
            program.major_program_name
          ) = v_normalized_query THEN 108::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              program.major_program_name
            ),
            v_normalized_query
          ) > 0 THEN 78
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            program.budget_program_name
          ) = v_normalized_query THEN 118::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              program.budget_program_name
            ),
            v_normalized_query
          ) > 0 THEN 88
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            program.detail_program_name
          ) = v_normalized_query THEN 112::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              program.detail_program_name
            ),
            v_normalized_query
          ) > 0 THEN 84
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            program.department_display_name
          ) = v_normalized_query THEN 106::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              program.department_display_name
            ),
            v_normalized_query
          ) > 0 THEN 76
          ELSE 0
        END,
        extensions.similarity(
          public.normalize_budget_search_text(
            program.major_program_name
            || ' '
            || program.budget_program_name
            || ' '
            || program.detail_program_name
            || ' '
            || program.department_display_name
          ),
          v_normalized_query
        ) * 42
      )) AS score,
      (
        ARRAY_AGG(
          CASE
            WHEN strpos(
              public.normalize_budget_search_text(
                program.budget_program_name
              ),
              v_normalized_query
            ) > 0
              THEN 'budget_program_name'
            WHEN strpos(
              public.normalize_budget_search_text(
                program.detail_program_name
              ),
              v_normalized_query
            ) > 0
              THEN 'detail_program_name'
            WHEN strpos(
              public.normalize_budget_search_text(
                program.major_program_name
              ),
              v_normalized_query
            ) > 0
              THEN 'major_program_name'
            ELSE 'department_display_name'
          END
          ORDER BY program.program_id
        )
      )[1] AS matched_field
    FROM public.budget_programs AS program
    JOIN identity_base AS identity
      ON identity.dataset_id = program.dataset_id
      AND identity.budget_program_identity_id
        = program.budget_program_identity_id
    WHERE strpos(
        public.normalize_budget_search_text(
          program.major_program_name
          || ' '
          || program.budget_program_name
          || ' '
          || program.detail_program_name
          || ' '
          || program.department_display_name
        ),
        v_normalized_query
      ) > 0
      OR extensions.similarity(
        public.normalize_budget_search_text(
          program.major_program_name
          || ' '
          || program.budget_program_name
          || ' '
          || program.detail_program_name
          || ' '
          || program.department_display_name
        ),
        v_normalized_query
      ) >= 0.22
    GROUP BY program.dataset_id, program.budget_program_identity_id
  ),
  hierarchy_matches AS (
    SELECT
      identity.dataset_id,
      identity.budget_program_identity_id,
      GREATEST(
        CASE
          WHEN public.normalize_budget_search_text(
            identity.item_kan_name
          ) = v_normalized_query THEN 104::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              identity.item_kan_name
            ),
            v_normalized_query
          ) > 0 THEN 72
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            identity.item_kou_name
          ) = v_normalized_query THEN 104::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              identity.item_kou_name
            ),
            v_normalized_query
          ) > 0 THEN 72
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            identity.item_moku_name
          ) = v_normalized_query THEN 108::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(
              identity.item_moku_name
            ),
            v_normalized_query
          ) > 0 THEN 76
          ELSE 0
        END,
        extensions.similarity(
          public.normalize_budget_search_text(
            identity.item_kan_name
            || ' '
            || identity.item_kou_name
            || ' '
            || identity.item_moku_name
          ),
          v_normalized_query
        ) * 38
      ) AS score,
      CASE
        WHEN strpos(
          public.normalize_budget_search_text(
            identity.item_moku_name
          ),
          v_normalized_query
        ) > 0 THEN 'moku_name'
        WHEN strpos(
          public.normalize_budget_search_text(
            identity.item_kou_name
          ),
          v_normalized_query
        ) > 0 THEN 'kou_name'
        ELSE 'kan_name'
      END AS matched_field
    FROM identity_base AS identity
    WHERE strpos(
        public.normalize_budget_search_text(
          identity.item_kan_name
          || ' '
          || identity.item_kou_name
          || ' '
          || identity.item_moku_name
        ),
        v_normalized_query
      ) > 0
      OR extensions.similarity(
        public.normalize_budget_search_text(
          identity.item_kan_name
          || ' '
          || identity.item_kou_name
          || ' '
          || identity.item_moku_name
        ),
        v_normalized_query
      ) >= 0.22
  ),
  topic_matches AS (
    SELECT
      published_topic.dataset_id,
      published_topic.budget_program_identity_id,
      MAX(
        CASE
          WHEN public.normalize_budget_search_text(published_topic.name)
            = v_normalized_query THEN 116::DOUBLE PRECISION
          WHEN strpos(
            public.normalize_budget_search_text(published_topic.name),
            v_normalized_query
          ) > 0 THEN 86
          ELSE extensions.similarity(
            public.normalize_budget_search_text(published_topic.name),
            v_normalized_query
          ) * 42
        END
      ) AS score,
      'topic_name'::TEXT AS matched_field
    FROM published_topic_relations AS published_topic
    WHERE (
        strpos(
          public.normalize_budget_search_text(published_topic.name),
          v_normalized_query
        ) > 0
        OR extensions.similarity(
          public.normalize_budget_search_text(published_topic.name),
          v_normalized_query
        ) >= 0.22
      )
    GROUP BY
      published_topic.dataset_id,
      published_topic.budget_program_identity_id
  ),
  published_topic_tags AS (
    SELECT
      published_topic.dataset_id,
      published_topic.budget_program_identity_id,
      jsonb_agg(
        jsonb_build_object(
          'slug', published_topic.slug,
          'name', published_topic.name
        )
        ORDER BY published_topic.name, published_topic.slug
      ) AS published_topics
    FROM published_topic_relations AS published_topic
    GROUP BY
      published_topic.dataset_id,
      published_topic.budget_program_identity_id
  ),
  all_matches AS (
    SELECT * FROM identity_matches
    UNION ALL
    SELECT * FROM program_matches
    UNION ALL
    SELECT * FROM hierarchy_matches
    UNION ALL
    SELECT * FROM topic_matches
  ),
  ranked_matches AS (
    SELECT
      match.dataset_id,
      match.budget_program_identity_id,
      MAX(match.score) AS score,
      (
        ARRAY_AGG(
          match.matched_field
          ORDER BY match.score DESC, match.matched_field
        )
      )[1] AS matched_field
    FROM all_matches AS match
    GROUP BY match.dataset_id, match.budget_program_identity_id
  ),
  result AS (
    SELECT
      identity.dataset_id,
      identity.budget_program_identity_id,
      identity.fiscal_year,
      identity.account_code,
      identity.account_name,
      identity.budget_item_key,
      identity.kan_code,
      identity.kan_name,
      identity.kou_code,
      identity.kou_name,
      identity.moku_code,
      identity.moku_name,
      identity.display_program_name,
      identity.department_display_name,
      identity.amount_thousand_yen,
      identity.member_group_count,
      identity.member_program_count,
      identity.related_revenue_count,
      identity.has_public_identity_resolution,
      identity.is_zero_amount,
      COALESCE(
        topic_tags.published_topics,
        '[]'::JSONB
      ) AS published_topics,
      match.score,
      match.matched_field
    FROM ranked_matches AS match
    JOIN identity_base AS identity
      ON identity.dataset_id = match.dataset_id
      AND identity.budget_program_identity_id
        = match.budget_program_identity_id
    LEFT JOIN published_topic_tags AS topic_tags
      ON topic_tags.dataset_id = identity.dataset_id
      AND topic_tags.budget_program_identity_id
        = identity.budget_program_identity_id
  )
  SELECT
    result.dataset_id,
    result.budget_program_identity_id,
    result.fiscal_year,
    result.account_code,
    result.account_name,
    result.budget_item_key,
    result.kan_code,
    result.kan_name,
    result.kou_code,
    result.kou_name,
    result.moku_code,
    result.moku_name,
    result.display_program_name,
    result.department_display_name,
    result.amount_thousand_yen,
    result.member_group_count,
    result.member_program_count,
    result.related_revenue_count,
    result.has_public_identity_resolution,
    result.is_zero_amount,
    result.published_topics,
    result.score,
    result.matched_field,
    COUNT(*) OVER() AS total_count
  FROM result
  ORDER BY
    result.score DESC,
    result.amount_thousand_yen DESC,
    result.budget_program_identity_id
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

REVOKE ALL ON FUNCTION public.search_budget_programs(
  TEXT,
  SMALLINT,
  TEXT,
  BOOLEAN,
  INTEGER,
  INTEGER
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_budget_programs(
  TEXT,
  SMALLINT,
  TEXT,
  BOOLEAN,
  INTEGER,
  INTEGER
) TO service_role;

COMMENT ON FUNCTION public.search_budget_programs(
  TEXT,
  SMALLINT,
  TEXT,
  BOOLEAN,
  INTEGER,
  INTEGER
) IS
  'activeな公開用予算事業identityを事業、階層、部署、公開済み課題から検索する。';
