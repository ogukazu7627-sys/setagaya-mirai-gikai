CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE public.budget_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year SMALLINT NOT NULL,
  budget_type TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  currency_unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'staging',
  manifest_json JSONB NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  import_summary_json JSONB NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'PENDING',
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT budget_datasets_fiscal_year_check
    CHECK (fiscal_year BETWEEN 2000 AND 2200),
  CONSTRAINT budget_datasets_status_check
    CHECK (status IN ('staging', 'active', 'archived')),
  CONSTRAINT budget_datasets_manifest_sha256_check
    CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT budget_datasets_manifest_json_check
    CHECK (jsonb_typeof(manifest_json) = 'object'),
  CONSTRAINT budget_datasets_import_summary_json_check
    CHECK (jsonb_typeof(import_summary_json) = 'object'),
  CONSTRAINT budget_datasets_validation_status_check
    CHECK (validation_status IN ('PENDING', 'PASS', 'FAIL')),
  UNIQUE (manifest_sha256)
);

CREATE UNIQUE INDEX budget_datasets_one_active_version_idx
  ON public.budget_datasets (fiscal_year, budget_type)
  WHERE status = 'active';

CREATE INDEX budget_datasets_fiscal_year_idx
  ON public.budget_datasets (fiscal_year);

CREATE TABLE public.budget_items (
  dataset_id UUID NOT NULL
    REFERENCES public.budget_datasets(id) ON DELETE CASCADE,
  budget_item_key TEXT NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  budget_side TEXT NOT NULL,
  kan_code TEXT NOT NULL,
  kan_name TEXT NOT NULL,
  kou_code TEXT NOT NULL,
  kou_name TEXT NOT NULL,
  moku_code TEXT NOT NULL,
  moku_name TEXT NOT NULL,
  amount_thousand_yen BIGINT NOT NULL,
  validation_status TEXT NOT NULL,
  is_zero_amount BOOLEAN NOT NULL,
  data_availability JSONB NOT NULL,
  source_references JSONB NOT NULL,
  PRIMARY KEY (dataset_id, budget_item_key),
  CONSTRAINT budget_items_account_code_check
    CHECK (
      account_code IN (
        'general',
        'national_health_insurance',
        'latter_stage_elderly_healthcare',
        'long_term_care_insurance',
        'school_lunch_fee'
      )
    ),
  CONSTRAINT budget_items_budget_side_check
    CHECK (budget_side = 'expenditure'),
  CONSTRAINT budget_items_hierarchy_code_check
    CHECK (
      kan_code ~ '^[0-9]{2}$'
      AND kou_code ~ '^[0-9]{2}$'
      AND moku_code ~ '^[0-9]{2}$'
    ),
  CONSTRAINT budget_items_validation_status_check
    CHECK (validation_status IN ('ok', 'ok_zero_amount')),
  CONSTRAINT budget_items_zero_amount_check
    CHECK (is_zero_amount = (amount_thousand_yen = 0)),
  CONSTRAINT budget_items_data_availability_check
    CHECK (jsonb_typeof(data_availability) = 'object'),
  CONSTRAINT budget_items_source_references_check
    CHECK (jsonb_typeof(source_references) = 'array')
);

CREATE TABLE public.budget_program_identities (
  dataset_id UUID NOT NULL,
  budget_program_identity_id TEXT NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  budget_side TEXT NOT NULL,
  budget_item_key TEXT NOT NULL,
  kan_code TEXT NOT NULL,
  kan_name TEXT NOT NULL,
  kou_code TEXT NOT NULL,
  kou_name TEXT NOT NULL,
  moku_code TEXT NOT NULL,
  moku_name TEXT NOT NULL,
  display_program_name TEXT NOT NULL,
  department_display_name TEXT NOT NULL,
  amount_thousand_yen BIGINT NOT NULL,
  member_group_count INTEGER NOT NULL,
  member_program_count INTEGER NOT NULL,
  related_revenue_count INTEGER NOT NULL,
  has_public_identity_resolution BOOLEAN NOT NULL,
  is_zero_amount BOOLEAN NOT NULL,
  source_type TEXT NOT NULL,
  PRIMARY KEY (dataset_id, budget_program_identity_id),
  UNIQUE (
    dataset_id,
    budget_program_identity_id,
    budget_item_key
  ),
  CONSTRAINT budget_program_identities_budget_item_fkey
    FOREIGN KEY (dataset_id, budget_item_key)
    REFERENCES public.budget_items(dataset_id, budget_item_key)
    ON DELETE CASCADE,
  CONSTRAINT budget_program_identities_account_code_check
    CHECK (
      account_code IN (
        'general',
        'national_health_insurance',
        'latter_stage_elderly_healthcare',
        'long_term_care_insurance',
        'school_lunch_fee'
      )
    ),
  CONSTRAINT budget_program_identities_budget_side_check
    CHECK (budget_side = 'expenditure'),
  CONSTRAINT budget_program_identities_hierarchy_code_check
    CHECK (
      kan_code ~ '^[0-9]{2}$'
      AND kou_code ~ '^[0-9]{2}$'
      AND moku_code ~ '^[0-9]{2}$'
    ),
  CONSTRAINT budget_program_identities_member_count_check
    CHECK (
      member_group_count >= 0
      AND member_program_count >= 0
      AND related_revenue_count >= 0
    ),
  CONSTRAINT budget_program_identities_zero_amount_check
    CHECK (is_zero_amount = (amount_thousand_yen = 0)),
  CONSTRAINT budget_program_identities_source_type_check
    CHECK (source_type = 'derived_public')
);

CREATE TABLE public.budget_programs (
  dataset_id UUID NOT NULL,
  program_id TEXT NOT NULL,
  budget_item_key TEXT NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  budget_side TEXT NOT NULL,
  kan_code TEXT NOT NULL,
  kan_name TEXT NOT NULL,
  kou_code TEXT NOT NULL,
  kou_name TEXT NOT NULL,
  moku_code TEXT NOT NULL,
  moku_name TEXT NOT NULL,
  major_program_name TEXT NOT NULL,
  budget_program_name TEXT NOT NULL,
  detail_program_name TEXT NOT NULL,
  department_display_name TEXT NOT NULL,
  amount_thousand_yen BIGINT NOT NULL,
  is_zero_amount BOOLEAN NOT NULL,
  source_type TEXT NOT NULL,
  source_file TEXT NOT NULL,
  source_row_number INTEGER NOT NULL,
  budget_program_identity_id TEXT NOT NULL,
  PRIMARY KEY (dataset_id, program_id),
  CONSTRAINT budget_programs_identity_item_fkey
    FOREIGN KEY (
    dataset_id,
    budget_program_identity_id,
    budget_item_key
  )
    REFERENCES public.budget_program_identities(
      dataset_id,
      budget_program_identity_id,
      budget_item_key
    )
    ON DELETE CASCADE,
  CONSTRAINT budget_programs_account_code_check
    CHECK (
      account_code IN (
        'general',
        'national_health_insurance',
        'latter_stage_elderly_healthcare',
        'long_term_care_insurance',
        'school_lunch_fee'
      )
    ),
  CONSTRAINT budget_programs_budget_side_check
    CHECK (budget_side = 'expenditure'),
  CONSTRAINT budget_programs_hierarchy_code_check
    CHECK (
      kan_code ~ '^[0-9]{2}$'
      AND kou_code ~ '^[0-9]{2}$'
      AND moku_code ~ '^[0-9]{2}$'
    ),
  CONSTRAINT budget_programs_zero_amount_check
    CHECK (is_zero_amount = (amount_thousand_yen = 0)),
  CONSTRAINT budget_programs_source_type_check
    CHECK (source_type = 'official_csv'),
  CONSTRAINT budget_programs_source_row_number_check
    CHECK (source_row_number > 0)
);

CREATE TABLE public.budget_item_sections (
  dataset_id UUID NOT NULL,
  section_id TEXT NOT NULL,
  budget_item_key TEXT NOT NULL,
  setsu_code TEXT NOT NULL,
  setsu_name TEXT NOT NULL,
  amount_thousand_yen BIGINT NOT NULL,
  scope TEXT NOT NULL,
  source_reference JSONB NOT NULL,
  PRIMARY KEY (dataset_id, section_id),
  CONSTRAINT budget_item_sections_budget_item_fkey
    FOREIGN KEY (dataset_id, budget_item_key)
    REFERENCES public.budget_items(dataset_id, budget_item_key)
    ON DELETE CASCADE,
  CONSTRAINT budget_item_sections_setsu_code_check
    CHECK (setsu_code ~ '^[0-9]{2}$'),
  CONSTRAINT budget_item_sections_scope_check
    CHECK (scope = 'budget_item'),
  CONSTRAINT budget_item_sections_source_reference_check
    CHECK (jsonb_typeof(source_reference) = 'object')
);

CREATE TABLE public.budget_revenue_items (
  dataset_id UUID NOT NULL
    REFERENCES public.budget_datasets(id) ON DELETE CASCADE,
  revenue_item_key TEXT NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  budget_side TEXT NOT NULL,
  kan_code TEXT NOT NULL,
  kan_name TEXT NOT NULL,
  kou_code TEXT NOT NULL,
  kou_name TEXT NOT NULL,
  moku_code TEXT NOT NULL,
  moku_name TEXT NOT NULL,
  previous_amount_thousand_yen BIGINT NOT NULL,
  current_amount_thousand_yen BIGINT NOT NULL,
  diff_amount_thousand_yen BIGINT NOT NULL,
  general_revenue_thousand_yen BIGINT NOT NULL,
  specific_revenue_thousand_yen BIGINT NOT NULL,
  special_account_revenue_thousand_yen BIGINT NOT NULL,
  validation_status TEXT NOT NULL,
  is_zero_amount BOOLEAN NOT NULL,
  revenue_source_display JSONB NOT NULL,
  data_availability JSONB NOT NULL,
  source_references JSONB NOT NULL,
  PRIMARY KEY (dataset_id, revenue_item_key),
  CONSTRAINT budget_revenue_items_account_code_check
    CHECK (
      account_code IN (
        'general',
        'national_health_insurance',
        'latter_stage_elderly_healthcare',
        'long_term_care_insurance',
        'school_lunch_fee'
      )
    ),
  CONSTRAINT budget_revenue_items_budget_side_check
    CHECK (budget_side = 'revenue'),
  CONSTRAINT budget_revenue_items_hierarchy_code_check
    CHECK (
      kan_code ~ '^[0-9]{2}$'
      AND kou_code ~ '^[0-9]{2}$'
      AND moku_code ~ '^[0-9]{2}$'
    ),
  CONSTRAINT budget_revenue_items_amount_diff_check
    CHECK (
      diff_amount_thousand_yen
        = current_amount_thousand_yen - previous_amount_thousand_yen
    ),
  CONSTRAINT budget_revenue_items_composition_check
    CHECK (
      current_amount_thousand_yen
        = general_revenue_thousand_yen
        + specific_revenue_thousand_yen
        + special_account_revenue_thousand_yen
    ),
  CONSTRAINT budget_revenue_items_validation_status_check
    CHECK (validation_status IN ('ok', 'ok_zero_amount')),
  CONSTRAINT budget_revenue_items_zero_amount_check
    CHECK (is_zero_amount = (current_amount_thousand_yen = 0)),
  CONSTRAINT budget_revenue_items_json_check
    CHECK (
      jsonb_typeof(revenue_source_display) = 'object'
      AND jsonb_typeof(data_availability) = 'object'
      AND jsonb_typeof(source_references) = 'array'
    )
);

CREATE TABLE public.budget_revenue_sections (
  dataset_id UUID NOT NULL,
  revenue_section_id TEXT NOT NULL,
  revenue_item_key TEXT NOT NULL,
  setsu_code TEXT NOT NULL,
  setsu_name TEXT NOT NULL,
  previous_amount_thousand_yen BIGINT NOT NULL,
  current_amount_thousand_yen BIGINT NOT NULL,
  diff_amount_thousand_yen BIGINT NOT NULL,
  detail_count INTEGER NOT NULL,
  validation_status TEXT NOT NULL,
  source_reference JSONB NOT NULL,
  PRIMARY KEY (dataset_id, revenue_section_id),
  UNIQUE (dataset_id, revenue_section_id, revenue_item_key),
  CONSTRAINT budget_revenue_sections_item_fkey
    FOREIGN KEY (dataset_id, revenue_item_key)
    REFERENCES public.budget_revenue_items(dataset_id, revenue_item_key)
    ON DELETE CASCADE,
  CONSTRAINT budget_revenue_sections_setsu_code_check
    CHECK (setsu_code ~ '^[0-9]{2}$'),
  CONSTRAINT budget_revenue_sections_amount_diff_check
    CHECK (
      diff_amount_thousand_yen
        = current_amount_thousand_yen - previous_amount_thousand_yen
    ),
  CONSTRAINT budget_revenue_sections_detail_count_check
    CHECK (detail_count >= 0),
  CONSTRAINT budget_revenue_sections_validation_status_check
    CHECK (validation_status IN ('ok', 'ok_zero_amount')),
  CONSTRAINT budget_revenue_sections_source_reference_check
    CHECK (jsonb_typeof(source_reference) = 'object')
);

CREATE TABLE public.budget_revenue_details (
  dataset_id UUID NOT NULL,
  revenue_detail_id TEXT NOT NULL,
  revenue_section_id TEXT NOT NULL,
  revenue_item_key TEXT NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  budget_side TEXT NOT NULL,
  kan_code TEXT NOT NULL,
  kan_name TEXT NOT NULL,
  kou_code TEXT NOT NULL,
  kou_name TEXT NOT NULL,
  moku_code TEXT NOT NULL,
  moku_name TEXT NOT NULL,
  setsu_code TEXT NOT NULL,
  setsu_name TEXT NOT NULL,
  saisetsu_code TEXT NOT NULL,
  saisetsu_name TEXT NOT NULL,
  department_display_name TEXT NOT NULL,
  source_funding_category_name TEXT NOT NULL,
  funding_nature TEXT NOT NULL,
  previous_amount_thousand_yen BIGINT NOT NULL,
  current_amount_thousand_yen BIGINT NOT NULL,
  diff_amount_thousand_yen BIGINT NOT NULL,
  is_zero_amount BOOLEAN NOT NULL,
  related_program_count INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_file TEXT NOT NULL,
  source_row_number INTEGER NOT NULL,
  PRIMARY KEY (dataset_id, revenue_detail_id),
  CONSTRAINT budget_revenue_details_section_item_fkey
    FOREIGN KEY (
    dataset_id,
    revenue_section_id,
    revenue_item_key
  )
    REFERENCES public.budget_revenue_sections(
      dataset_id,
      revenue_section_id,
      revenue_item_key
    )
    ON DELETE CASCADE,
  CONSTRAINT budget_revenue_details_account_code_check
    CHECK (
      account_code IN (
        'general',
        'national_health_insurance',
        'latter_stage_elderly_healthcare',
        'long_term_care_insurance',
        'school_lunch_fee'
      )
    ),
  CONSTRAINT budget_revenue_details_budget_side_check
    CHECK (budget_side = 'revenue'),
  CONSTRAINT budget_revenue_details_hierarchy_code_check
    CHECK (
      kan_code ~ '^[0-9]{2}$'
      AND kou_code ~ '^[0-9]{2}$'
      AND moku_code ~ '^[0-9]{2}$'
      AND setsu_code ~ '^[0-9]{2}$'
      AND saisetsu_code ~ '^[0-9]{2}$'
    ),
  CONSTRAINT budget_revenue_details_funding_nature_check
    CHECK (funding_nature IN ('general', 'specific', 'special_account')),
  CONSTRAINT budget_revenue_details_amount_diff_check
    CHECK (
      diff_amount_thousand_yen
        = current_amount_thousand_yen - previous_amount_thousand_yen
    ),
  CONSTRAINT budget_revenue_details_zero_amount_check
    CHECK (is_zero_amount = (current_amount_thousand_yen = 0)),
  CONSTRAINT budget_revenue_details_related_program_count_check
    CHECK (related_program_count >= 0),
  CONSTRAINT budget_revenue_details_source_type_check
    CHECK (source_type = 'official_csv'),
  CONSTRAINT budget_revenue_details_source_row_number_check
    CHECK (source_row_number > 0)
);

CREATE TABLE public.budget_revenue_allocations (
  dataset_id UUID NOT NULL,
  allocation_link_id TEXT NOT NULL,
  revenue_detail_id TEXT NOT NULL,
  target_budget_program_identity_id TEXT NOT NULL,
  target_budget_program_group_id TEXT,
  target_budget_item_key TEXT NOT NULL,
  target_account_code TEXT NOT NULL,
  target_program_name TEXT NOT NULL,
  target_budget_book_page INTEGER NOT NULL,
  target_resolution_level TEXT NOT NULL,
  candidate_target_group_count INTEGER NOT NULL,
  relation_type TEXT NOT NULL,
  allocation_amount_thousand_yen BIGINT,
  amount_attribution_status TEXT NOT NULL,
  source_reference JSONB NOT NULL,
  PRIMARY KEY (dataset_id, allocation_link_id),
  CONSTRAINT budget_revenue_allocations_detail_fkey
    FOREIGN KEY (dataset_id, revenue_detail_id)
    REFERENCES public.budget_revenue_details(dataset_id, revenue_detail_id)
    ON DELETE CASCADE,
  CONSTRAINT budget_revenue_allocations_identity_item_fkey
    FOREIGN KEY (
    dataset_id,
    target_budget_program_identity_id,
    target_budget_item_key
  )
    REFERENCES public.budget_program_identities(
      dataset_id,
      budget_program_identity_id,
      budget_item_key
    )
    ON DELETE CASCADE,
  CONSTRAINT budget_revenue_allocations_target_account_code_check
    CHECK (
      target_account_code IN (
        'general',
        'national_health_insurance',
        'latter_stage_elderly_healthcare',
        'long_term_care_insurance',
        'school_lunch_fee'
      )
    ),
  CONSTRAINT budget_revenue_allocations_target_page_check
    CHECK (target_budget_book_page > 0),
  CONSTRAINT budget_revenue_allocations_resolution_check
    CHECK (
      (
        target_resolution_level = 'exact_group'
        AND target_budget_program_group_id IS NOT NULL
        AND candidate_target_group_count = 1
      )
      OR
      (
        target_resolution_level = 'public_identity'
        AND target_budget_program_group_id IS NULL
        AND candidate_target_group_count >= 2
      )
    ),
  CONSTRAINT budget_revenue_allocations_relation_type_check
    CHECK (relation_type = 'allocated_to_program'),
  CONSTRAINT budget_revenue_allocations_amount_check
    CHECK (allocation_amount_thousand_yen IS NULL),
  CONSTRAINT budget_revenue_allocations_attribution_status_check
    CHECK (amount_attribution_status = 'not_available'),
  CONSTRAINT budget_revenue_allocations_source_reference_check
    CHECK (jsonb_typeof(source_reference) = 'object')
);

CREATE TABLE public.budget_source_documents (
  dataset_id UUID NOT NULL
    REFERENCES public.budget_datasets(id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,
  source_type TEXT NOT NULL,
  official_url TEXT,
  note TEXT NOT NULL,
  fiscal_year SMALLINT NOT NULL,
  storage_object_path TEXT,
  sha256 TEXT,
  PRIMARY KEY (dataset_id, source_type, source_file),
  CONSTRAINT budget_source_documents_source_type_check
    CHECK (
      source_type IN (
        'official_csv',
        'official_pdf',
        'public_dataset_file'
      )
    ),
  CONSTRAINT budget_source_documents_storage_check
    CHECK (
      (
        source_type = 'public_dataset_file'
        AND storage_object_path IS NOT NULL
        AND sha256 ~ '^[a-f0-9]{64}$'
      )
      OR
      (
        source_type <> 'public_dataset_file'
        AND storage_object_path IS NULL
        AND sha256 IS NULL
      )
    )
);

CREATE INDEX budget_program_identities_account_idx
  ON public.budget_program_identities (dataset_id, account_code);
CREATE INDEX budget_program_identities_fiscal_year_idx
  ON public.budget_program_identities (fiscal_year);
CREATE INDEX budget_program_identities_identity_id_idx
  ON public.budget_program_identities (budget_program_identity_id);
CREATE INDEX budget_program_identities_budget_item_idx
  ON public.budget_program_identities (dataset_id, budget_item_key);
CREATE INDEX budget_program_identities_display_name_trgm_idx
  ON public.budget_program_identities
  USING GIN (display_program_name extensions.gin_trgm_ops);
CREATE INDEX budget_program_identities_department_trgm_idx
  ON public.budget_program_identities
  USING GIN (department_display_name extensions.gin_trgm_ops);

CREATE INDEX budget_programs_account_idx
  ON public.budget_programs (dataset_id, account_code);
CREATE INDEX budget_programs_fiscal_year_idx
  ON public.budget_programs (fiscal_year);
CREATE INDEX budget_programs_program_id_idx
  ON public.budget_programs (program_id);
CREATE INDEX budget_programs_budget_item_idx
  ON public.budget_programs (dataset_id, budget_item_key);
CREATE INDEX budget_programs_identity_idx
  ON public.budget_programs (dataset_id, budget_program_identity_id);
CREATE INDEX budget_programs_names_trgm_idx
  ON public.budget_programs
  USING GIN (
    (
      major_program_name
      || ' '
      || budget_program_name
      || ' '
      || detail_program_name
    ) extensions.gin_trgm_ops
  );

CREATE INDEX budget_items_account_idx
  ON public.budget_items (dataset_id, account_code);
CREATE INDEX budget_items_fiscal_year_idx
  ON public.budget_items (fiscal_year);
CREATE INDEX budget_items_budget_item_key_idx
  ON public.budget_items (budget_item_key);
CREATE INDEX budget_items_hierarchy_names_trgm_idx
  ON public.budget_items
  USING GIN (
    (kan_name || ' ' || kou_name || ' ' || moku_name)
    extensions.gin_trgm_ops
  );

CREATE INDEX budget_item_sections_budget_item_idx
  ON public.budget_item_sections (dataset_id, budget_item_key);

CREATE INDEX budget_revenue_items_account_idx
  ON public.budget_revenue_items (dataset_id, account_code);
CREATE INDEX budget_revenue_items_fiscal_year_idx
  ON public.budget_revenue_items (fiscal_year);
CREATE INDEX budget_revenue_items_item_key_idx
  ON public.budget_revenue_items (revenue_item_key);
CREATE INDEX budget_revenue_items_hierarchy_names_trgm_idx
  ON public.budget_revenue_items
  USING GIN (
    (kan_name || ' ' || kou_name || ' ' || moku_name)
    extensions.gin_trgm_ops
  );

CREATE INDEX budget_revenue_sections_item_idx
  ON public.budget_revenue_sections (dataset_id, revenue_item_key);

CREATE INDEX budget_revenue_details_account_idx
  ON public.budget_revenue_details (dataset_id, account_code);
CREATE INDEX budget_revenue_details_fiscal_year_idx
  ON public.budget_revenue_details (fiscal_year);
CREATE INDEX budget_revenue_details_detail_id_idx
  ON public.budget_revenue_details (revenue_detail_id);
CREATE INDEX budget_revenue_details_item_idx
  ON public.budget_revenue_details (dataset_id, revenue_item_key);
CREATE INDEX budget_revenue_details_section_idx
  ON public.budget_revenue_details (dataset_id, revenue_section_id);
CREATE INDEX budget_revenue_details_names_trgm_idx
  ON public.budget_revenue_details
  USING GIN (
    (
      kan_name
      || ' '
      || kou_name
      || ' '
      || moku_name
      || ' '
      || setsu_name
      || ' '
      || saisetsu_name
    ) extensions.gin_trgm_ops
  );
CREATE INDEX budget_revenue_details_department_trgm_idx
  ON public.budget_revenue_details
  USING GIN (department_display_name extensions.gin_trgm_ops);

CREATE INDEX budget_revenue_allocations_detail_idx
  ON public.budget_revenue_allocations (dataset_id, revenue_detail_id);
CREATE INDEX budget_revenue_allocations_identity_idx
  ON public.budget_revenue_allocations (
    dataset_id,
    target_budget_program_identity_id
  );
CREATE INDEX budget_revenue_allocations_item_idx
  ON public.budget_revenue_allocations (
    dataset_id,
    target_budget_item_key
  );

CREATE OR REPLACE FUNCTION public.validate_budget_dataset(
  p_dataset_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dataset public.budget_datasets%ROWTYPE;
  v_identity_count BIGINT;
  v_program_count BIGINT;
  v_item_count BIGINT;
  v_section_count BIGINT;
  v_revenue_item_count BIGINT;
  v_revenue_section_count BIGINT;
  v_revenue_detail_count BIGINT;
  v_allocation_count BIGINT;
  v_source_document_count BIGINT;
  v_identity_total BIGINT;
  v_program_total BIGINT;
  v_item_total BIGINT;
  v_section_total BIGINT;
  v_revenue_item_total BIGINT;
  v_revenue_section_total BIGINT;
  v_revenue_detail_total BIGINT;
  v_exact_group_count BIGINT;
  v_public_identity_count BIGINT;
  v_non_null_allocation_count BIGINT;
  v_invalid_year_count BIGINT;
  v_errors JSONB;
  v_account_errors JSONB;
  v_counts JSONB;
  v_totals JSONB;
  v_account_totals JSONB;
BEGIN
  SELECT *
  INTO v_dataset
  FROM public.budget_datasets
  WHERE id = p_dataset_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget dataset not found: %', p_dataset_id;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(amount_thousand_yen), 0)
  INTO v_identity_count, v_identity_total
  FROM public.budget_program_identities
  WHERE dataset_id = p_dataset_id;

  SELECT COUNT(*), COALESCE(SUM(amount_thousand_yen), 0)
  INTO v_program_count, v_program_total
  FROM public.budget_programs
  WHERE dataset_id = p_dataset_id;

  SELECT COUNT(*), COALESCE(SUM(amount_thousand_yen), 0)
  INTO v_item_count, v_item_total
  FROM public.budget_items
  WHERE dataset_id = p_dataset_id;

  SELECT COUNT(*), COALESCE(SUM(amount_thousand_yen), 0)
  INTO v_section_count, v_section_total
  FROM public.budget_item_sections
  WHERE dataset_id = p_dataset_id;

  SELECT COUNT(*), COALESCE(SUM(current_amount_thousand_yen), 0)
  INTO v_revenue_item_count, v_revenue_item_total
  FROM public.budget_revenue_items
  WHERE dataset_id = p_dataset_id;

  SELECT COUNT(*), COALESCE(SUM(current_amount_thousand_yen), 0)
  INTO v_revenue_section_count, v_revenue_section_total
  FROM public.budget_revenue_sections
  WHERE dataset_id = p_dataset_id;

  SELECT COUNT(*), COALESCE(SUM(current_amount_thousand_yen), 0)
  INTO v_revenue_detail_count, v_revenue_detail_total
  FROM public.budget_revenue_details
  WHERE dataset_id = p_dataset_id;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE target_resolution_level = 'exact_group'),
    COUNT(*) FILTER (WHERE target_resolution_level = 'public_identity'),
    COUNT(*) FILTER (WHERE allocation_amount_thousand_yen IS NOT NULL)
  INTO
    v_allocation_count,
    v_exact_group_count,
    v_public_identity_count,
    v_non_null_allocation_count
  FROM public.budget_revenue_allocations
  WHERE dataset_id = p_dataset_id;

  SELECT COUNT(*)
  INTO v_source_document_count
  FROM public.budget_source_documents
  WHERE dataset_id = p_dataset_id;

  SELECT
    (SELECT COUNT(*) FROM public.budget_items
      WHERE dataset_id = p_dataset_id
        AND fiscal_year <> v_dataset.fiscal_year)
    + (SELECT COUNT(*) FROM public.budget_program_identities
      WHERE dataset_id = p_dataset_id
        AND fiscal_year <> v_dataset.fiscal_year)
    + (SELECT COUNT(*) FROM public.budget_programs
      WHERE dataset_id = p_dataset_id
        AND fiscal_year <> v_dataset.fiscal_year)
    + (SELECT COUNT(*) FROM public.budget_revenue_items
      WHERE dataset_id = p_dataset_id
        AND fiscal_year <> v_dataset.fiscal_year)
    + (SELECT COUNT(*) FROM public.budget_revenue_details
      WHERE dataset_id = p_dataset_id
        AND fiscal_year <> v_dataset.fiscal_year)
    + (SELECT COUNT(*) FROM public.budget_source_documents
      WHERE dataset_id = p_dataset_id
        AND fiscal_year <> v_dataset.fiscal_year)
  INTO v_invalid_year_count;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'errorCode', error_code,
        'message', message,
        'expected', expected,
        'actual', actual
      )
      ORDER BY error_code
    ),
    '[]'::JSONB
  )
  INTO v_errors
  FROM (
    SELECT *
    FROM (
      VALUES
        (
          'PROGRAM_IDENTITY_COUNT_MISMATCH',
          'budget_program_identities count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'publicBudgetProgramIdentityCount')::BIGINT,
          v_identity_count
        ),
        (
          'PROGRAM_COUNT_MISMATCH',
          'budget_programs count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'publicBudgetProgramCount')::BIGINT,
          v_program_count
        ),
        (
          'BUDGET_ITEM_COUNT_MISMATCH',
          'budget_items count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'publicBudgetItemCount')::BIGINT,
          v_item_count
        ),
        (
          'BUDGET_ITEM_SECTION_COUNT_MISMATCH',
          'budget_item_sections count mismatch',
          (v_dataset.import_summary_json
            ->>'budget_item_section_count')::BIGINT,
          v_section_count
        ),
        (
          'REVENUE_ITEM_COUNT_MISMATCH',
          'budget_revenue_items count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'publicBudgetRevenueItemCount')::BIGINT,
          v_revenue_item_count
        ),
        (
          'REVENUE_SECTION_COUNT_MISMATCH',
          'budget_revenue_sections count mismatch',
          (v_dataset.import_summary_json
            ->>'revenue_section_count')::BIGINT,
          v_revenue_section_count
        ),
        (
          'REVENUE_DETAIL_COUNT_MISMATCH',
          'budget_revenue_details count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'publicBudgetRevenueDetailCount')::BIGINT,
          v_revenue_detail_count
        ),
        (
          'ALLOCATION_COUNT_MISMATCH',
          'budget_revenue_allocations count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'publicBudgetRevenueAllocationCount')::BIGINT,
          v_allocation_count
        ),
        (
          'SOURCE_DOCUMENT_COUNT_MISMATCH',
          'budget_source_documents count mismatch',
          (v_dataset.import_summary_json
            ->>'source_document_count')::BIGINT,
          v_source_document_count
        ),
        (
          'PROGRAM_IDENTITY_TOTAL_MISMATCH',
          'budget_program_identities total mismatch',
          (v_dataset.manifest_json->'totals'
            ->>'expenditureTotalAmountThousandYen')::BIGINT,
          v_identity_total
        ),
        (
          'PROGRAM_TOTAL_MISMATCH',
          'budget_programs total mismatch',
          (v_dataset.manifest_json->'totals'
            ->>'expenditureTotalAmountThousandYen')::BIGINT,
          v_program_total
        ),
        (
          'BUDGET_ITEM_TOTAL_MISMATCH',
          'budget_items total mismatch',
          (v_dataset.manifest_json->'totals'
            ->>'expenditureTotalAmountThousandYen')::BIGINT,
          v_item_total
        ),
        (
          'BUDGET_ITEM_SECTION_TOTAL_MISMATCH',
          'budget_item_sections total mismatch',
          (v_dataset.manifest_json->'totals'
            ->>'expenditureTotalAmountThousandYen')::BIGINT,
          v_section_total
        ),
        (
          'REVENUE_ITEM_TOTAL_MISMATCH',
          'budget_revenue_items total mismatch',
          (v_dataset.manifest_json->'totals'
            ->>'revenueTotalAmountThousandYen')::BIGINT,
          v_revenue_item_total
        ),
        (
          'REVENUE_SECTION_TOTAL_MISMATCH',
          'budget_revenue_sections total mismatch',
          (v_dataset.manifest_json->'totals'
            ->>'revenueTotalAmountThousandYen')::BIGINT,
          v_revenue_section_total
        ),
        (
          'REVENUE_DETAIL_TOTAL_MISMATCH',
          'budget_revenue_details total mismatch',
          (v_dataset.manifest_json->'totals'
            ->>'revenueTotalAmountThousandYen')::BIGINT,
          v_revenue_detail_total
        ),
        (
          'EXACT_GROUP_COUNT_MISMATCH',
          'exact_group allocation count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'exactGroupAllocationCount')::BIGINT,
          v_exact_group_count
        ),
        (
          'PUBLIC_IDENTITY_COUNT_MISMATCH',
          'public_identity allocation count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'publicIdentityAllocationCount')::BIGINT,
          v_public_identity_count
        ),
        (
          'ALLOCATION_AMOUNT_NON_NULL_COUNT_MISMATCH',
          'non-null allocation amount count mismatch',
          (v_dataset.manifest_json->'counts'
            ->>'allocationAmountNonNullCount')::BIGINT,
          v_non_null_allocation_count
        ),
        (
          'FISCAL_YEAR_MISMATCH',
          'rows outside the dataset fiscal year were found',
          0::BIGINT,
          v_invalid_year_count
        )
    ) AS checks(error_code, message, expected, actual)
    WHERE expected IS DISTINCT FROM actual
  ) AS mismatches;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'errorCode', 'ACCOUNT_TOTAL_MISMATCH',
        'message', 'account total mismatch: ' || account_code,
        'expected',
          jsonb_build_object(
            'expenditure', expected_expenditure,
            'revenue', expected_revenue
          ),
        'actual',
          jsonb_build_object(
            'expenditure', actual_expenditure,
            'revenue', actual_revenue
          )
      )
      ORDER BY account_code
    ),
    '[]'::JSONB
  )
  INTO v_account_errors
  FROM (
    SELECT
      account->>'account_code' AS account_code,
      (account->>'expenditure_amount_thousand_yen')::BIGINT
        AS expected_expenditure,
      (account->>'revenue_amount_thousand_yen')::BIGINT
        AS expected_revenue,
      COALESCE((
        SELECT SUM(item.amount_thousand_yen)
        FROM public.budget_items AS item
        WHERE item.dataset_id = p_dataset_id
          AND item.account_code = account->>'account_code'
      ), 0) AS actual_expenditure,
      COALESCE((
        SELECT SUM(item.current_amount_thousand_yen)
        FROM public.budget_revenue_items AS item
        WHERE item.dataset_id = p_dataset_id
          AND item.account_code = account->>'account_code'
      ), 0) AS actual_revenue
    FROM jsonb_array_elements(
      v_dataset.manifest_json->'accountTotals'
    ) AS account
  ) AS totals
  WHERE
    expected_expenditure IS DISTINCT FROM actual_expenditure
    OR expected_revenue IS DISTINCT FROM actual_revenue;

  v_errors := v_errors || v_account_errors;

  v_counts := jsonb_build_object(
    'budgetProgramIdentityCount', v_identity_count,
    'budgetProgramCount', v_program_count,
    'budgetItemCount', v_item_count,
    'budgetItemSectionCount', v_section_count,
    'budgetRevenueItemCount', v_revenue_item_count,
    'budgetRevenueSectionCount', v_revenue_section_count,
    'budgetRevenueDetailCount', v_revenue_detail_count,
    'budgetRevenueAllocationCount', v_allocation_count,
    'budgetSourceDocumentCount', v_source_document_count,
    'exactGroupAllocationCount', v_exact_group_count,
    'publicIdentityAllocationCount', v_public_identity_count,
    'allocationAmountNonNullCount', v_non_null_allocation_count
  );

  v_totals := jsonb_build_object(
    'programIdentityAmountThousandYen', v_identity_total,
    'programAmountThousandYen', v_program_total,
    'budgetItemAmountThousandYen', v_item_total,
    'budgetItemSectionAmountThousandYen', v_section_total,
    'revenueItemAmountThousandYen', v_revenue_item_total,
    'revenueSectionAmountThousandYen', v_revenue_section_total,
    'revenueDetailAmountThousandYen', v_revenue_detail_total
  );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'accountCode', account->>'account_code',
        'expenditureAmountThousandYen',
          COALESCE((
            SELECT SUM(item.amount_thousand_yen)
            FROM public.budget_items AS item
            WHERE item.dataset_id = p_dataset_id
              AND item.account_code = account->>'account_code'
          ), 0),
        'revenueAmountThousandYen',
          COALESCE((
            SELECT SUM(item.current_amount_thousand_yen)
            FROM public.budget_revenue_items AS item
            WHERE item.dataset_id = p_dataset_id
              AND item.account_code = account->>'account_code'
          ), 0)
      )
      ORDER BY account->>'account_code'
    ),
    '[]'::JSONB
  )
  INTO v_account_totals
  FROM jsonb_array_elements(
    v_dataset.manifest_json->'accountTotals'
  ) AS account;

  RETURN jsonb_build_object(
    'datasetId', p_dataset_id,
    'status',
      CASE WHEN jsonb_array_length(v_errors) = 0 THEN 'PASS' ELSE 'FAIL' END,
    'errors', v_errors,
    'counts', v_counts,
    'totals', v_totals,
    'accountTotals', v_account_totals
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.import_budget_dataset(
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_manifest JSONB := p_payload->'manifest';
  v_manifest_sha256 TEXT := p_payload->>'manifest_sha256';
  v_import_summary JSONB := p_payload->'import_summary';
  v_dataset_id UUID;
  v_existing_status TEXT;
  v_validation JSONB;
  v_required_array TEXT;
BEGIN
  IF jsonb_typeof(p_payload) <> 'object'
    OR jsonb_typeof(v_manifest) <> 'object'
    OR jsonb_typeof(v_import_summary) <> 'object'
  THEN
    RAISE EXCEPTION 'budget import payload must be a JSON object';
  END IF;

  IF v_manifest->'validation'->>'status' <> 'PASS' THEN
    RAISE EXCEPTION 'manifest validation status must be PASS';
  END IF;

  IF v_manifest_sha256 !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'manifest sha256 is invalid';
  END IF;

  FOREACH v_required_array IN ARRAY ARRAY[
    'budget_items',
    'budget_program_identities',
    'budget_programs',
    'budget_item_sections',
    'budget_revenue_items',
    'budget_revenue_sections',
    'budget_revenue_details',
    'budget_revenue_allocations',
    'budget_source_documents'
  ]
  LOOP
    IF jsonb_typeof(p_payload->v_required_array) <> 'array' THEN
      RAISE EXCEPTION '% must be a JSON array', v_required_array;
    END IF;
  END LOOP;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      (v_manifest->>'fiscalYear') || ':' || (v_manifest->>'budgetType'),
      0
    )
  );

  SELECT id, status
  INTO v_dataset_id, v_existing_status
  FROM public.budget_datasets
  WHERE manifest_sha256 = v_manifest_sha256;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'datasetId', v_dataset_id,
      'status', v_existing_status,
      'alreadyImported', TRUE
    );
  END IF;

  INSERT INTO public.budget_datasets (
    fiscal_year,
    budget_type,
    schema_version,
    currency_unit,
    status,
    manifest_json,
    manifest_sha256,
    import_summary_json,
    validation_status
  )
  VALUES (
    (v_manifest->>'fiscalYear')::SMALLINT,
    v_manifest->>'budgetType',
    v_manifest->>'schemaVersion',
    v_manifest->>'currencyUnit',
    'staging',
    v_manifest,
    v_manifest_sha256,
    v_import_summary,
    'PENDING'
  )
  RETURNING id INTO v_dataset_id;

  INSERT INTO public.budget_items
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_items,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(p_payload->'budget_items') AS entry(value);

  INSERT INTO public.budget_program_identities
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_program_identities,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(
    p_payload->'budget_program_identities'
  ) AS entry(value);

  INSERT INTO public.budget_programs
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_programs,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(p_payload->'budget_programs') AS entry(value);

  INSERT INTO public.budget_item_sections
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_item_sections,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(
    p_payload->'budget_item_sections'
  ) AS entry(value);

  INSERT INTO public.budget_revenue_items
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_revenue_items,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(
    p_payload->'budget_revenue_items'
  ) AS entry(value);

  INSERT INTO public.budget_revenue_sections
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_revenue_sections,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(
    p_payload->'budget_revenue_sections'
  ) AS entry(value);

  INSERT INTO public.budget_revenue_details
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_revenue_details,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(
    p_payload->'budget_revenue_details'
  ) AS entry(value);

  INSERT INTO public.budget_revenue_allocations
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_revenue_allocations,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(
    p_payload->'budget_revenue_allocations'
  ) AS entry(value);

  INSERT INTO public.budget_source_documents
  SELECT (
    jsonb_populate_record(
      NULL::public.budget_source_documents,
      entry.value || jsonb_build_object('dataset_id', v_dataset_id)
    )
  ).*
  FROM jsonb_array_elements(
    p_payload->'budget_source_documents'
  ) AS entry(value);

  v_validation := public.validate_budget_dataset(v_dataset_id);
  IF v_validation->>'status' <> 'PASS' THEN
    RAISE EXCEPTION
      'budget dataset validation failed: %',
      v_validation->'errors';
  END IF;

  UPDATE public.budget_datasets
  SET validation_status = 'PASS'
  WHERE id = v_dataset_id;

  RETURN jsonb_build_object(
    'datasetId', v_dataset_id,
    'status', 'staging',
    'alreadyImported', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_budget_dataset(
  p_dataset_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dataset public.budget_datasets%ROWTYPE;
  v_validation JSONB;
BEGIN
  SELECT *
  INTO v_dataset
  FROM public.budget_datasets
  WHERE id = p_dataset_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget dataset not found: %', p_dataset_id;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_dataset.fiscal_year::TEXT || ':' || v_dataset.budget_type,
      0
    )
  );

  IF v_dataset.status = 'active' THEN
    RETURN jsonb_build_object(
      'datasetId', p_dataset_id,
      'status', 'active',
      'alreadyActive', TRUE
    );
  END IF;

  IF v_dataset.status <> 'staging' THEN
    RAISE EXCEPTION
      'only staging datasets can be activated: %',
      v_dataset.status;
  END IF;

  v_validation := public.validate_budget_dataset(p_dataset_id);
  IF v_validation->>'status' <> 'PASS' THEN
    UPDATE public.budget_datasets
    SET validation_status = 'FAIL'
    WHERE id = p_dataset_id;
    RAISE EXCEPTION
      'budget dataset validation failed: %',
      v_validation->'errors';
  END IF;

  UPDATE public.budget_datasets
  SET
    status = 'archived',
    archived_at = NOW()
  WHERE fiscal_year = v_dataset.fiscal_year
    AND budget_type = v_dataset.budget_type
    AND status = 'active'
    AND id <> p_dataset_id;

  UPDATE public.budget_datasets
  SET
    status = 'active',
    validation_status = 'PASS',
    activated_at = COALESCE(activated_at, NOW()),
    archived_at = NULL
  WHERE id = p_dataset_id;

  RETURN jsonb_build_object(
    'datasetId', p_dataset_id,
    'status', 'active',
    'alreadyActive', FALSE
  );
END;
$$;

ALTER TABLE public.budget_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_program_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_item_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revenue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revenue_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revenue_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revenue_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_source_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_datasets_active_select
ON public.budget_datasets
FOR SELECT
TO anon, authenticated
USING (status = 'active');

CREATE POLICY budget_program_identities_active_select
ON public.budget_program_identities
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_program_identities.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_programs_active_select
ON public.budget_programs
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_programs.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_items_active_select
ON public.budget_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_items.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_item_sections_active_select
ON public.budget_item_sections
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_item_sections.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_revenue_items_active_select
ON public.budget_revenue_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_revenue_items.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_revenue_sections_active_select
ON public.budget_revenue_sections
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_revenue_sections.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_revenue_details_active_select
ON public.budget_revenue_details
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_revenue_details.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_revenue_allocations_active_select
ON public.budget_revenue_allocations
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_revenue_allocations.dataset_id
      AND dataset.status = 'active'
  )
);

CREATE POLICY budget_source_documents_active_select
ON public.budget_source_documents
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_source_documents.dataset_id
      AND dataset.status = 'active'
  )
);

REVOKE ALL ON TABLE
  public.budget_datasets,
  public.budget_program_identities,
  public.budget_programs,
  public.budget_items,
  public.budget_item_sections,
  public.budget_revenue_items,
  public.budget_revenue_sections,
  public.budget_revenue_details,
  public.budget_revenue_allocations,
  public.budget_source_documents
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.budget_datasets,
  public.budget_program_identities,
  public.budget_programs,
  public.budget_items,
  public.budget_item_sections,
  public.budget_revenue_items,
  public.budget_revenue_sections,
  public.budget_revenue_details,
  public.budget_revenue_allocations,
  public.budget_source_documents
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.budget_datasets,
  public.budget_program_identities,
  public.budget_programs,
  public.budget_items,
  public.budget_item_sections,
  public.budget_revenue_items,
  public.budget_revenue_sections,
  public.budget_revenue_details,
  public.budget_revenue_allocations,
  public.budget_source_documents
TO service_role;

REVOKE ALL ON FUNCTION public.import_budget_dataset(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_budget_dataset(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_budget_dataset(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.import_budget_dataset(JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_budget_dataset(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_budget_dataset(UUID)
  TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('budget-datasets', 'budget-datasets', FALSE)
ON CONFLICT (id) DO UPDATE
SET public = FALSE;

COMMENT ON TABLE public.budget_datasets IS
  '公開用当初予算データの年度・版・active状態を管理する。';
COMMENT ON TABLE public.budget_item_sections IS
  '節は個別事業ではなくbudget_item_keyが示す目全体に属する。';
COMMENT ON TABLE public.budget_revenue_allocations IS
  '歳入細節と歳出予算事業identityの金額を持たない関係。';
COMMENT ON COLUMN
  public.budget_revenue_allocations.allocation_amount_thousand_yen IS
  '配分額は公開資料から特定できないため常にNULL。';
COMMENT ON TABLE public.budget_source_documents IS
  '公式出典と非公開Storageへ保存した公開用入力ファイルを追跡する。';
