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
      AND dataset.budget_type = 'initial_budget'
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
    'published_topics',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', topic.id,
          'slug', topic.slug,
          'name', topic.name,
          'short_description', topic.short_description,
          'topic_kind', topic.topic_kind,
          'relation_type', topic_program.relation_type,
          'explanation', topic_program.explanation,
          'evidence_level', topic_program.evidence_level,
          'evidence_fields', topic_program.evidence_fields,
          'evidence_source_url', topic_program.evidence_source_url,
          'categories',
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'slug', category.slug,
                'name', category.name,
                'is_primary', topic_category.is_primary
              )
              ORDER BY
                topic_category.is_primary DESC,
                category.sort_order,
                category.id
            )
            FROM public.budget_topic_categories AS topic_category
            JOIN public.budget_categories AS category
              ON category.id = topic_category.category_id
            WHERE topic_category.topic_id = topic.id
              AND category.status = 'published'
          ), '[]'::JSONB)
        )
        ORDER BY topic.name, topic.id
      )
      FROM public.budget_topic_programs AS topic_program
      JOIN public.budget_topics AS topic
        ON topic.id = topic_program.topic_id
      WHERE topic_program.dataset_id = identity.dataset_id
        AND topic_program.budget_program_identity_id
          = identity.budget_program_identity_id
        AND topic_program.review_status = 'published'
        AND topic.status = 'published'
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
          SELECT jsonb_build_object(
            'source_type', detail.source_type,
            'source_file', detail.source_file,
            'source_row_number', detail.source_row_number
          )
          FROM public.budget_revenue_allocations AS allocation
          JOIN public.budget_revenue_details AS detail
            ON detail.dataset_id = allocation.dataset_id
            AND detail.revenue_detail_id = allocation.revenue_detail_id
          WHERE allocation.dataset_id = identity.dataset_id
            AND allocation.target_budget_program_identity_id
              = identity.budget_program_identity_id
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

REVOKE ALL ON FUNCTION public.get_budget_program_detail(TEXT, SMALLINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_budget_program_detail(TEXT, SMALLINT)
  TO service_role;

COMMENT ON FUNCTION public.get_budget_program_detail(TEXT, SMALLINT) IS
  '予算事業identity、公開済み課題関係、目単位の節、関連歳入を一括取得する。';
