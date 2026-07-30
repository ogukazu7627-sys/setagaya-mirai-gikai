CREATE OR REPLACE FUNCTION public.normalize_budget_search_text(
  p_value TEXT
)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT lower(
    regexp_replace(
      normalize(COALESCE(p_value, ''), NFKC),
      '[-[:space:]・･‐‑‒–—―−()]+',
      '',
      'g'
    )
  );
$$;

CREATE INDEX budget_program_identities_normalized_search_trgm_idx
  ON public.budget_program_identities
  USING GIN (
    public.normalize_budget_search_text(
      display_program_name || ' ' || department_display_name
    ) extensions.gin_trgm_ops
  );

CREATE INDEX budget_programs_normalized_search_trgm_idx
  ON public.budget_programs
  USING GIN (
    public.normalize_budget_search_text(
      major_program_name
      || ' '
      || budget_program_name
      || ' '
      || detail_program_name
      || ' '
      || department_display_name
    ) extensions.gin_trgm_ops
  );

CREATE INDEX budget_items_normalized_hierarchy_trgm_idx
  ON public.budget_items
  USING GIN (
    public.normalize_budget_search_text(
      kan_name || ' ' || kou_name || ' ' || moku_name
    ) extensions.gin_trgm_ops
  );

CREATE OR REPLACE FUNCTION public.get_budget_overview(
  p_fiscal_year SMALLINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH active_dataset AS MATERIALIZED (
    SELECT dataset.*
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
  accounts AS (
    SELECT item.account_code, item.account_name
    FROM public.budget_items AS item
    JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
    UNION
    SELECT item.account_code, item.account_name
    FROM public.budget_revenue_items AS item
    JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
  ),
  account_totals AS (
    SELECT
      account.account_code,
      account.account_name,
      COALESCE((
        SELECT SUM(item.amount_thousand_yen)
        FROM public.budget_items AS item
        JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
        WHERE item.account_code = account.account_code
      ), 0)::BIGINT AS expenditure_amount_thousand_yen,
      COALESCE((
        SELECT SUM(item.current_amount_thousand_yen)
        FROM public.budget_revenue_items AS item
        JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
        WHERE item.account_code = account.account_code
      ), 0)::BIGINT AS revenue_amount_thousand_yen,
      COALESCE((
        SELECT COUNT(*)
        FROM public.budget_program_identities AS identity
        JOIN active_dataset AS dataset ON dataset.id = identity.dataset_id
        WHERE identity.account_code = account.account_code
      ), 0)::BIGINT AS identity_count
    FROM accounts AS account
  )
  SELECT jsonb_build_object(
    'active_dataset',
    (
      SELECT jsonb_build_object(
        'id', dataset.id,
        'fiscal_year', dataset.fiscal_year,
        'budget_type', dataset.budget_type,
        'schema_version', dataset.schema_version,
        'currency_unit', dataset.currency_unit,
        'manifest_sha256', dataset.manifest_sha256,
        'validation_status', dataset.validation_status,
        'activated_at', dataset.activated_at
      )
      FROM active_dataset AS dataset
    ),
    'fiscal_year',
    COALESCE(
      (SELECT dataset.fiscal_year FROM active_dataset AS dataset),
      p_fiscal_year
    ),
    'accounts',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'account_code', total.account_code,
          'account_name', total.account_name,
          'expenditure_amount_thousand_yen',
          total.expenditure_amount_thousand_yen,
          'revenue_amount_thousand_yen',
          total.revenue_amount_thousand_yen,
          'identity_count', total.identity_count
        )
        ORDER BY total.account_code
      )
      FROM account_totals AS total
    ), '[]'::JSONB),
    'expenditure_total_amount_thousand_yen',
    COALESCE((
      SELECT SUM(item.amount_thousand_yen)
      FROM public.budget_items AS item
      JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
    ), 0)::BIGINT,
    'revenue_total_amount_thousand_yen',
    COALESCE((
      SELECT SUM(item.current_amount_thousand_yen)
      FROM public.budget_revenue_items AS item
      JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
    ), 0)::BIGINT,
    'identity_count',
    COALESCE((
      SELECT COUNT(*)
      FROM public.budget_program_identities AS identity
      JOIN active_dataset AS dataset ON dataset.id = identity.dataset_id
    ), 0)::BIGINT
  );
$$;

CREATE OR REPLACE FUNCTION public.search_budget_programs(
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
  identity_matches AS (
    SELECT
      identity.dataset_id,
      identity.budget_program_identity_id,
      GREATEST(
        CASE
          WHEN public.normalize_budget_search_text(
            identity.display_program_name
          ) = v_normalized_query THEN 120::DOUBLE PRECISION
          WHEN public.normalize_budget_search_text(
            identity.display_program_name
          ) LIKE '%' || v_normalized_query || '%' THEN 90
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
          WHEN public.normalize_budget_search_text(
            identity.department_display_name
          ) LIKE '%' || v_normalized_query || '%' THEN 82
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
        WHEN public.normalize_budget_search_text(
          identity.display_program_name
        ) LIKE '%' || v_normalized_query || '%'
          THEN 'display_program_name'
        ELSE 'department_display_name'
      END AS matched_field
    FROM identity_base AS identity
    WHERE public.normalize_budget_search_text(
        identity.display_program_name
        || ' '
        || identity.department_display_name
      ) LIKE '%' || v_normalized_query || '%'
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
          WHEN public.normalize_budget_search_text(
            program.major_program_name
          ) LIKE '%' || v_normalized_query || '%' THEN 78
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            program.budget_program_name
          ) = v_normalized_query THEN 118::DOUBLE PRECISION
          WHEN public.normalize_budget_search_text(
            program.budget_program_name
          ) LIKE '%' || v_normalized_query || '%' THEN 88
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            program.detail_program_name
          ) = v_normalized_query THEN 112::DOUBLE PRECISION
          WHEN public.normalize_budget_search_text(
            program.detail_program_name
          ) LIKE '%' || v_normalized_query || '%' THEN 84
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            program.department_display_name
          ) = v_normalized_query THEN 106::DOUBLE PRECISION
          WHEN public.normalize_budget_search_text(
            program.department_display_name
          ) LIKE '%' || v_normalized_query || '%' THEN 76
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
            WHEN public.normalize_budget_search_text(
              program.budget_program_name
            ) LIKE '%' || v_normalized_query || '%'
              THEN 'budget_program_name'
            WHEN public.normalize_budget_search_text(
              program.detail_program_name
            ) LIKE '%' || v_normalized_query || '%'
              THEN 'detail_program_name'
            WHEN public.normalize_budget_search_text(
              program.major_program_name
            ) LIKE '%' || v_normalized_query || '%'
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
    WHERE public.normalize_budget_search_text(
        program.major_program_name
        || ' '
        || program.budget_program_name
        || ' '
        || program.detail_program_name
        || ' '
        || program.department_display_name
      ) LIKE '%' || v_normalized_query || '%'
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
          WHEN public.normalize_budget_search_text(
            identity.item_kan_name
          ) LIKE '%' || v_normalized_query || '%' THEN 72
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            identity.item_kou_name
          ) = v_normalized_query THEN 104::DOUBLE PRECISION
          WHEN public.normalize_budget_search_text(
            identity.item_kou_name
          ) LIKE '%' || v_normalized_query || '%' THEN 72
          ELSE 0
        END,
        CASE
          WHEN public.normalize_budget_search_text(
            identity.item_moku_name
          ) = v_normalized_query THEN 108::DOUBLE PRECISION
          WHEN public.normalize_budget_search_text(
            identity.item_moku_name
          ) LIKE '%' || v_normalized_query || '%' THEN 76
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
        WHEN public.normalize_budget_search_text(
          identity.item_moku_name
        ) LIKE '%' || v_normalized_query || '%' THEN 'moku_name'
        WHEN public.normalize_budget_search_text(
          identity.item_kou_name
        ) LIKE '%' || v_normalized_query || '%' THEN 'kou_name'
        ELSE 'kan_name'
      END AS matched_field
    FROM identity_base AS identity
    WHERE public.normalize_budget_search_text(
        identity.item_kan_name
        || ' '
        || identity.item_kou_name
        || ' '
        || identity.item_moku_name
      ) LIKE '%' || v_normalized_query || '%'
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
  all_matches AS (
    SELECT * FROM identity_matches
    UNION ALL
    SELECT * FROM program_matches
    UNION ALL
    SELECT * FROM hierarchy_matches
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
      match.score,
      match.matched_field
    FROM ranked_matches AS match
    JOIN identity_base AS identity
      ON identity.dataset_id = match.dataset_id
      AND identity.budget_program_identity_id
        = match.budget_program_identity_id
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

CREATE OR REPLACE FUNCTION public.get_budget_program_detail(
  p_budget_program_identity_id TEXT,
  p_fiscal_year SMALLINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH active_dataset AS MATERIALIZED (
    SELECT dataset.*
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
  selected_identity AS MATERIALIZED (
    SELECT identity.*
    FROM public.budget_program_identities AS identity
    JOIN active_dataset AS dataset ON dataset.id = identity.dataset_id
    WHERE identity.budget_program_identity_id
      = p_budget_program_identity_id
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'active_dataset',
    jsonb_build_object(
      'id', dataset.id,
      'fiscal_year', dataset.fiscal_year,
      'budget_type', dataset.budget_type,
      'schema_version', dataset.schema_version,
      'currency_unit', dataset.currency_unit,
      'manifest_sha256', dataset.manifest_sha256
    ),
    'identity',
    jsonb_build_object(
      'budget_program_identity_id',
      identity.budget_program_identity_id,
      'fiscal_year', identity.fiscal_year,
      'account_code', identity.account_code,
      'account_name', identity.account_name,
      'budget_side', identity.budget_side,
      'budget_item_key', identity.budget_item_key,
      'kan_code', identity.kan_code,
      'kan_name', identity.kan_name,
      'kou_code', identity.kou_code,
      'kou_name', identity.kou_name,
      'moku_code', identity.moku_code,
      'moku_name', identity.moku_name,
      'display_program_name', identity.display_program_name,
      'department_display_name', identity.department_display_name,
      'amount_thousand_yen', identity.amount_thousand_yen,
      'member_group_count', identity.member_group_count,
      'member_program_count', identity.member_program_count,
      'related_revenue_count', identity.related_revenue_count,
      'has_public_identity_resolution',
      identity.has_public_identity_resolution,
      'is_zero_amount', identity.is_zero_amount,
      'source_type', identity.source_type
    ),
    'member_programs',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'program_id', program.program_id,
          'major_program_name', program.major_program_name,
          'budget_program_name', program.budget_program_name,
          'detail_program_name', program.detail_program_name,
          'department_display_name', program.department_display_name,
          'amount_thousand_yen', program.amount_thousand_yen,
          'is_zero_amount', program.is_zero_amount,
          'source_reference', jsonb_build_object(
            'source_type', program.source_type,
            'source_file', program.source_file,
            'source_row_number', program.source_row_number
          )
        )
        ORDER BY program.program_id
      )
      FROM public.budget_programs AS program
      WHERE program.dataset_id = identity.dataset_id
        AND program.budget_program_identity_id
          = identity.budget_program_identity_id
    ), '[]'::JSONB),
    'budget_item',
    (
      SELECT jsonb_build_object(
        'budget_item_key', item.budget_item_key,
        'fiscal_year', item.fiscal_year,
        'account_code', item.account_code,
        'account_name', item.account_name,
        'budget_side', item.budget_side,
        'kan_code', item.kan_code,
        'kan_name', item.kan_name,
        'kou_code', item.kou_code,
        'kou_name', item.kou_name,
        'moku_code', item.moku_code,
        'moku_name', item.moku_name,
        'amount_thousand_yen', item.amount_thousand_yen,
        'validation_status', item.validation_status,
        'is_zero_amount', item.is_zero_amount,
        'data_availability', item.data_availability,
        'source_references', item.source_references
      )
      FROM public.budget_items AS item
      WHERE item.dataset_id = identity.dataset_id
        AND item.budget_item_key = identity.budget_item_key
    ),
    'other_programs',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'budget_program_identity_id',
          other_identity.budget_program_identity_id,
          'display_program_name', other_identity.display_program_name,
          'department_display_name',
          other_identity.department_display_name,
          'amount_thousand_yen', other_identity.amount_thousand_yen,
          'is_zero_amount', other_identity.is_zero_amount
        )
        ORDER BY
          other_identity.display_program_name,
          other_identity.budget_program_identity_id
      )
      FROM public.budget_program_identities AS other_identity
      WHERE other_identity.dataset_id = identity.dataset_id
        AND other_identity.budget_item_key = identity.budget_item_key
        AND other_identity.budget_program_identity_id
          <> identity.budget_program_identity_id
    ), '[]'::JSONB),
    'sections',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'section_id', section.section_id,
          'setsu_code', section.setsu_code,
          'setsu_name', section.setsu_name,
          'amount_thousand_yen', section.amount_thousand_yen,
          'scope', section.scope,
          'source_reference', section.source_reference
        )
        ORDER BY section.setsu_code, section.section_id
      )
      FROM public.budget_item_sections AS section
      WHERE section.dataset_id = identity.dataset_id
        AND section.budget_item_key = identity.budget_item_key
    ), '[]'::JSONB),
    'related_revenue_details',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'allocation_link_id', allocation.allocation_link_id,
          'target_resolution_level',
          allocation.target_resolution_level,
          'relation_type', allocation.relation_type,
          'amount_attribution_status',
          allocation.amount_attribution_status,
          'revenue_detail_id', detail.revenue_detail_id,
          'revenue_item_key', detail.revenue_item_key,
          'account_code', detail.account_code,
          'account_name', detail.account_name,
          'kan_code', detail.kan_code,
          'kan_name', detail.kan_name,
          'kou_code', detail.kou_code,
          'kou_name', detail.kou_name,
          'moku_code', detail.moku_code,
          'moku_name', detail.moku_name,
          'setsu_code', detail.setsu_code,
          'setsu_name', detail.setsu_name,
          'saisetsu_code', detail.saisetsu_code,
          'saisetsu_name', detail.saisetsu_name,
          'department_display_name',
          detail.department_display_name,
          'source_funding_category_name',
          detail.source_funding_category_name,
          'funding_nature', detail.funding_nature,
          'current_amount_thousand_yen',
          detail.current_amount_thousand_yen,
          'source_reference', jsonb_build_object(
            'source_type', detail.source_type,
            'source_file', detail.source_file,
            'source_row_number', detail.source_row_number
          ),
          'allocation_source_reference',
          allocation.source_reference
        )
        ORDER BY
          detail.revenue_item_key,
          detail.revenue_detail_id,
          allocation.allocation_link_id
      )
      FROM public.budget_revenue_allocations AS allocation
      JOIN public.budget_revenue_details AS detail
        ON detail.dataset_id = allocation.dataset_id
        AND detail.revenue_detail_id = allocation.revenue_detail_id
      WHERE allocation.dataset_id = identity.dataset_id
        AND allocation.target_budget_program_identity_id
          = identity.budget_program_identity_id
    ), '[]'::JSONB),
    'source_references',
    COALESCE((
      SELECT jsonb_agg(reference.value ORDER BY reference.value::TEXT)
      FROM (
        SELECT DISTINCT source.value
        FROM (
          SELECT jsonb_build_object(
            'source_type', program.source_type,
            'source_file', program.source_file,
            'source_row_number', program.source_row_number
          ) AS value
          FROM public.budget_programs AS program
          WHERE program.dataset_id = identity.dataset_id
            AND program.budget_program_identity_id
              = identity.budget_program_identity_id
          UNION ALL
          SELECT item_reference.value
          FROM public.budget_items AS item
          CROSS JOIN LATERAL jsonb_array_elements(
            item.source_references
          ) AS item_reference(value)
          WHERE item.dataset_id = identity.dataset_id
            AND item.budget_item_key = identity.budget_item_key
          UNION ALL
          SELECT section.source_reference
          FROM public.budget_item_sections AS section
          WHERE section.dataset_id = identity.dataset_id
            AND section.budget_item_key = identity.budget_item_key
          UNION ALL
          SELECT allocation.source_reference
          FROM public.budget_revenue_allocations AS allocation
          WHERE allocation.dataset_id = identity.dataset_id
            AND allocation.target_budget_program_identity_id
              = identity.budget_program_identity_id
        ) AS source
      ) AS reference
    ), '[]'::JSONB)
  )
  FROM selected_identity AS identity
  JOIN active_dataset AS dataset ON dataset.id = identity.dataset_id;
$$;

CREATE OR REPLACE FUNCTION public.get_budget_official_hierarchy(
  p_fiscal_year SMALLINT DEFAULT NULL,
  p_account_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
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

  WITH active_dataset AS MATERIALIZED (
    SELECT dataset.*
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
  )
  SELECT jsonb_build_object(
    'active_dataset',
    (
      SELECT jsonb_build_object(
        'id', dataset.id,
        'fiscal_year', dataset.fiscal_year,
        'budget_type', dataset.budget_type,
        'schema_version', dataset.schema_version,
        'currency_unit', dataset.currency_unit,
        'manifest_sha256', dataset.manifest_sha256
      )
      FROM active_dataset AS dataset
    ),
    'accounts',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'account_code', account.account_code,
          'account_name', account.account_name,
          'amount_thousand_yen', account.amount_thousand_yen,
          'kans',
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'code', kan.kan_code,
                'name', kan.kan_name,
                'amount_thousand_yen', kan.amount_thousand_yen,
                'kous',
                COALESCE((
                  SELECT jsonb_agg(
                    jsonb_build_object(
                      'code', kou.kou_code,
                      'name', kou.kou_name,
                      'amount_thousand_yen',
                      kou.amount_thousand_yen,
                      'mokus',
                      COALESCE((
                        SELECT jsonb_agg(
                          jsonb_build_object(
                            'code', moku.moku_code,
                            'name', moku.moku_name,
                            'budget_item_key',
                            moku.budget_item_key,
                            'amount_thousand_yen',
                            moku.amount_thousand_yen,
                            'validation_status',
                            moku.validation_status,
                            'is_zero_amount',
                            moku.is_zero_amount,
                            'programs',
                            COALESCE((
                              SELECT jsonb_agg(
                                jsonb_build_object(
                                  'budget_program_identity_id',
                                  identity.budget_program_identity_id,
                                  'display_program_name',
                                  identity.display_program_name,
                                  'department_display_name',
                                  identity.department_display_name,
                                  'amount_thousand_yen',
                                  identity.amount_thousand_yen,
                                  'is_zero_amount',
                                  identity.is_zero_amount
                                )
                                ORDER BY
                                  identity.display_program_name,
                                  identity.budget_program_identity_id
                              )
                              FROM public.budget_program_identities
                                AS identity
                              WHERE identity.dataset_id = moku.dataset_id
                                AND identity.budget_item_key
                                  = moku.budget_item_key
                            ), '[]'::JSONB)
                          )
                          ORDER BY moku.moku_code, moku.budget_item_key
                        )
                        FROM public.budget_items AS moku
                        WHERE moku.dataset_id = kou.dataset_id
                          AND moku.account_code = kou.account_code
                          AND moku.kan_code = kou.kan_code
                          AND moku.kou_code = kou.kou_code
                      ), '[]'::JSONB)
                    )
                    ORDER BY kou.kou_code
                  )
                  FROM (
                    SELECT
                      item.dataset_id,
                      item.account_code,
                      item.kan_code,
                      item.kou_code,
                      MIN(item.kou_name) AS kou_name,
                      SUM(item.amount_thousand_yen)::BIGINT
                        AS amount_thousand_yen
                    FROM public.budget_items AS item
                    WHERE item.dataset_id = kan.dataset_id
                      AND item.account_code = kan.account_code
                      AND item.kan_code = kan.kan_code
                    GROUP BY
                      item.dataset_id,
                      item.account_code,
                      item.kan_code,
                      item.kou_code
                  ) AS kou
                ), '[]'::JSONB)
              )
              ORDER BY kan.kan_code
            )
            FROM (
              SELECT
                item.dataset_id,
                item.account_code,
                item.kan_code,
                MIN(item.kan_name) AS kan_name,
                SUM(item.amount_thousand_yen)::BIGINT
                  AS amount_thousand_yen
              FROM public.budget_items AS item
              WHERE item.dataset_id = account.dataset_id
                AND item.account_code = account.account_code
              GROUP BY
                item.dataset_id,
                item.account_code,
                item.kan_code
            ) AS kan
          ), '[]'::JSONB)
        )
        ORDER BY account.account_code
      )
      FROM (
        SELECT
          item.dataset_id,
          item.account_code,
          MIN(item.account_name) AS account_name,
          SUM(item.amount_thousand_yen)::BIGINT
            AS amount_thousand_yen
        FROM public.budget_items AS item
        JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
        WHERE (
          p_account_code IS NULL
          OR item.account_code = p_account_code
        )
        GROUP BY item.dataset_id, item.account_code
      ) AS account
    ), '[]'::JSONB)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_budget_revenue_item(
  p_revenue_item_key TEXT,
  p_fiscal_year SMALLINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH active_dataset AS MATERIALIZED (
    SELECT dataset.*
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
  selected_item AS MATERIALIZED (
    SELECT item.*
    FROM public.budget_revenue_items AS item
    JOIN active_dataset AS dataset ON dataset.id = item.dataset_id
    WHERE item.revenue_item_key = p_revenue_item_key
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'active_dataset',
    jsonb_build_object(
      'id', dataset.id,
      'fiscal_year', dataset.fiscal_year,
      'budget_type', dataset.budget_type,
      'schema_version', dataset.schema_version,
      'currency_unit', dataset.currency_unit,
      'manifest_sha256', dataset.manifest_sha256
    ),
    'item',
    jsonb_build_object(
      'revenue_item_key', item.revenue_item_key,
      'fiscal_year', item.fiscal_year,
      'account_code', item.account_code,
      'account_name', item.account_name,
      'budget_side', item.budget_side,
      'kan_code', item.kan_code,
      'kan_name', item.kan_name,
      'kou_code', item.kou_code,
      'kou_name', item.kou_name,
      'moku_code', item.moku_code,
      'moku_name', item.moku_name,
      'previous_amount_thousand_yen',
      item.previous_amount_thousand_yen,
      'current_amount_thousand_yen',
      item.current_amount_thousand_yen,
      'diff_amount_thousand_yen',
      item.diff_amount_thousand_yen,
      'general_revenue_thousand_yen',
      item.general_revenue_thousand_yen,
      'specific_revenue_thousand_yen',
      item.specific_revenue_thousand_yen,
      'special_account_revenue_thousand_yen',
      item.special_account_revenue_thousand_yen,
      'validation_status', item.validation_status,
      'is_zero_amount', item.is_zero_amount,
      'revenue_source_display', item.revenue_source_display,
      'data_availability', item.data_availability,
      'source_references', item.source_references
    ),
    'sections',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'revenue_section_id', section.revenue_section_id,
          'setsu_code', section.setsu_code,
          'setsu_name', section.setsu_name,
          'previous_amount_thousand_yen',
          section.previous_amount_thousand_yen,
          'current_amount_thousand_yen',
          section.current_amount_thousand_yen,
          'diff_amount_thousand_yen',
          section.diff_amount_thousand_yen,
          'detail_count', section.detail_count,
          'validation_status', section.validation_status,
          'source_reference', section.source_reference
        )
        ORDER BY section.setsu_code, section.revenue_section_id
      )
      FROM public.budget_revenue_sections AS section
      WHERE section.dataset_id = item.dataset_id
        AND section.revenue_item_key = item.revenue_item_key
    ), '[]'::JSONB),
    'details',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'revenue_detail_id', detail.revenue_detail_id,
          'revenue_section_id', detail.revenue_section_id,
          'setsu_code', detail.setsu_code,
          'setsu_name', detail.setsu_name,
          'saisetsu_code', detail.saisetsu_code,
          'saisetsu_name', detail.saisetsu_name,
          'department_display_name',
          detail.department_display_name,
          'source_funding_category_name',
          detail.source_funding_category_name,
          'funding_nature', detail.funding_nature,
          'previous_amount_thousand_yen',
          detail.previous_amount_thousand_yen,
          'current_amount_thousand_yen',
          detail.current_amount_thousand_yen,
          'diff_amount_thousand_yen',
          detail.diff_amount_thousand_yen,
          'is_zero_amount', detail.is_zero_amount,
          'related_program_count', detail.related_program_count,
          'source_reference', jsonb_build_object(
            'source_type', detail.source_type,
            'source_file', detail.source_file,
            'source_row_number', detail.source_row_number
          )
        )
        ORDER BY
          detail.setsu_code,
          detail.saisetsu_code,
          detail.revenue_detail_id
      )
      FROM public.budget_revenue_details AS detail
      WHERE detail.dataset_id = item.dataset_id
        AND detail.revenue_item_key = item.revenue_item_key
    ), '[]'::JSONB),
    'related_expenditure_programs',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'budget_program_identity_id',
          related.budget_program_identity_id,
          'budget_item_key', related.budget_item_key,
          'account_code', related.account_code,
          'account_name', related.account_name,
          'display_program_name', related.display_program_name,
          'department_display_name',
          related.department_display_name,
          'amount_thousand_yen', related.amount_thousand_yen,
          'relation_count', related.relation_count,
          'revenue_detail_ids', related.revenue_detail_ids,
          'target_resolution_levels',
          related.target_resolution_levels,
          'source_references', related.source_references
        )
        ORDER BY
          related.display_program_name,
          related.budget_program_identity_id
      )
      FROM (
        SELECT
          identity.budget_program_identity_id,
          identity.budget_item_key,
          identity.account_code,
          identity.account_name,
          identity.display_program_name,
          identity.department_display_name,
          identity.amount_thousand_yen,
          COUNT(*)::INTEGER AS relation_count,
          jsonb_agg(
            DISTINCT allocation.revenue_detail_id
            ORDER BY allocation.revenue_detail_id
          ) AS revenue_detail_ids,
          jsonb_agg(
            DISTINCT allocation.target_resolution_level
            ORDER BY allocation.target_resolution_level
          ) AS target_resolution_levels,
          jsonb_agg(DISTINCT allocation.source_reference)
            AS source_references
        FROM public.budget_revenue_allocations AS allocation
        JOIN public.budget_revenue_details AS detail
          ON detail.dataset_id = allocation.dataset_id
          AND detail.revenue_detail_id = allocation.revenue_detail_id
        JOIN public.budget_program_identities AS identity
          ON identity.dataset_id = allocation.dataset_id
          AND identity.budget_program_identity_id
            = allocation.target_budget_program_identity_id
        WHERE detail.dataset_id = item.dataset_id
          AND detail.revenue_item_key = item.revenue_item_key
        GROUP BY
          identity.budget_program_identity_id,
          identity.budget_item_key,
          identity.account_code,
          identity.account_name,
          identity.display_program_name,
          identity.department_display_name,
          identity.amount_thousand_yen
      ) AS related
    ), '[]'::JSONB),
    'source_references',
    COALESCE((
      SELECT jsonb_agg(reference.value ORDER BY reference.value::TEXT)
      FROM (
        SELECT DISTINCT source.value
        FROM (
          SELECT item_reference.value
          FROM jsonb_array_elements(item.source_references)
            AS item_reference(value)
          UNION ALL
          SELECT section.source_reference
          FROM public.budget_revenue_sections AS section
          WHERE section.dataset_id = item.dataset_id
            AND section.revenue_item_key = item.revenue_item_key
          UNION ALL
          SELECT jsonb_build_object(
            'source_type', detail.source_type,
            'source_file', detail.source_file,
            'source_row_number', detail.source_row_number
          )
          FROM public.budget_revenue_details AS detail
          WHERE detail.dataset_id = item.dataset_id
            AND detail.revenue_item_key = item.revenue_item_key
        ) AS source
      ) AS reference
    ), '[]'::JSONB)
  )
  FROM selected_item AS item
  JOIN active_dataset AS dataset ON dataset.id = item.dataset_id;
$$;

REVOKE ALL ON FUNCTION public.normalize_budget_search_text(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_budget_overview(SMALLINT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_budget_programs(
  TEXT,
  SMALLINT,
  TEXT,
  BOOLEAN,
  INTEGER,
  INTEGER
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_budget_program_detail(TEXT, SMALLINT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_budget_official_hierarchy(SMALLINT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_budget_revenue_item(TEXT, SMALLINT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.normalize_budget_search_text(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_budget_overview(SMALLINT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.search_budget_programs(
  TEXT,
  SMALLINT,
  TEXT,
  BOOLEAN,
  INTEGER,
  INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_budget_program_detail(TEXT, SMALLINT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_budget_official_hierarchy(SMALLINT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_budget_revenue_item(TEXT, SMALLINT)
  TO service_role;

COMMENT ON FUNCTION public.normalize_budget_search_text(TEXT) IS
  '予算検索のためNFKC化し、空白・表記揺れ記号を除去する。';
COMMENT ON FUNCTION public.get_budget_overview(SMALLINT) IS
  'activeな公開用予算データセットの会計別歳入・歳出概要を返す。';
COMMENT ON FUNCTION public.search_budget_programs(
  TEXT,
  SMALLINT,
  TEXT,
  BOOLEAN,
  INTEGER,
  INTEGER
) IS
  'activeな公開用予算事業identityを完全一致・部分一致・trigramで検索する。';
COMMENT ON FUNCTION public.get_budget_program_detail(TEXT, SMALLINT) IS
  '予算事業identityと目単位の節、関連歳入を一括取得する。';
COMMENT ON FUNCTION public.get_budget_official_hierarchy(SMALLINT, TEXT) IS
  'activeな歳出予算を会計・款・項・目・事業の公的階層で返す。';
COMMENT ON FUNCTION public.get_budget_revenue_item(TEXT, SMALLINT) IS
  '歳入の目、節、細節、関連する歳出予算事業を一括取得する。';
