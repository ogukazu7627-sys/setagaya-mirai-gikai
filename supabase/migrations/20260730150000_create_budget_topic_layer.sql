CREATE TABLE public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  CONSTRAINT budget_categories_slug_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT budget_categories_name_check
    CHECK (btrim(name) <> '' AND char_length(name) <= 80),
  CONSTRAINT budget_categories_short_description_check
    CHECK (
      btrim(short_description) <> ''
      AND char_length(short_description) <= 300
    ),
  CONSTRAINT budget_categories_sort_order_check
    CHECK (sort_order >= 0),
  CONSTRAINT budget_categories_status_check
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE public.budget_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  topic_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  editorial_note TEXT NOT NULL DEFAULT '',
  CONSTRAINT budget_topics_slug_check
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT budget_topics_name_check
    CHECK (btrim(name) <> '' AND char_length(name) <= 160),
  CONSTRAINT budget_topics_short_description_check
    CHECK (char_length(short_description) <= 500),
  CONSTRAINT budget_topics_published_description_check
    CHECK (
      status <> 'published'
      OR btrim(short_description) <> ''
    ),
  CONSTRAINT budget_topics_kind_check
    CHECK (
      topic_kind IN (
        'problem',
        'goal',
        'administrative_function'
      )
    ),
  CONSTRAINT budget_topics_status_check
    CHECK (status IN ('draft', 'review', 'published', 'archived'))
);

CREATE TABLE public.budget_topic_categories (
  topic_id UUID NOT NULL
    REFERENCES public.budget_topics(id) ON DELETE CASCADE,
  category_id UUID NOT NULL
    REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  relevance_weight NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (topic_id, category_id),
  CONSTRAINT budget_topic_categories_relevance_weight_check
    CHECK (relevance_weight > 0 AND relevance_weight <= 1)
);

CREATE TABLE public.budget_topic_programs (
  topic_id UUID NOT NULL
    REFERENCES public.budget_topics(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL,
  budget_program_identity_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  evidence_level TEXT NOT NULL,
  evidence_fields JSONB NOT NULL DEFAULT '{}'::JSONB,
  evidence_source_url TEXT,
  review_status TEXT NOT NULL DEFAULT 'candidate',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (
    topic_id,
    dataset_id,
    budget_program_identity_id
  ),
  CONSTRAINT budget_topic_programs_identity_fkey
    FOREIGN KEY (dataset_id, budget_program_identity_id)
    REFERENCES public.budget_program_identities(
      dataset_id,
      budget_program_identity_id
    )
    ON DELETE CASCADE,
  CONSTRAINT budget_topic_programs_relation_type_check
    CHECK (
      relation_type IN (
        'responds_to',
        'supports',
        'maintains',
        'enables'
      )
    ),
  CONSTRAINT budget_topic_programs_explanation_check
    CHECK (char_length(explanation) <= 2000),
  CONSTRAINT budget_topic_programs_evidence_level_check
    CHECK (
      evidence_level IN (
        'A_official_direct',
        'B_strong_structural',
        'C_editorial'
      )
    ),
  CONSTRAINT budget_topic_programs_evidence_fields_check
    CHECK (jsonb_typeof(evidence_fields) = 'object'),
  CONSTRAINT budget_topic_programs_evidence_source_url_check
    CHECK (
      evidence_source_url IS NULL
      OR (
        evidence_source_url ~ '^https?://'
        AND char_length(evidence_source_url) <= 2000
      )
    ),
  CONSTRAINT budget_topic_programs_review_status_check
    CHECK (
      review_status IN (
        'candidate',
        'review',
        'approved',
        'published',
        'rejected',
        'archived'
      )
    ),
  CONSTRAINT budget_topic_programs_reviewed_check
    CHECK (
      review_status NOT IN ('approved', 'published')
      OR (
        reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND btrim(explanation) <> ''
      )
    )
);

CREATE INDEX budget_categories_published_order_idx
  ON public.budget_categories (sort_order, id)
  WHERE status = 'published';

CREATE INDEX budget_topics_status_kind_idx
  ON public.budget_topics (status, topic_kind, name);

CREATE INDEX budget_topic_categories_category_idx
  ON public.budget_topic_categories (category_id, topic_id);

CREATE UNIQUE INDEX budget_topic_categories_one_primary_idx
  ON public.budget_topic_categories (topic_id)
  WHERE is_primary;

CREATE INDEX budget_topic_programs_identity_idx
  ON public.budget_topic_programs (
    dataset_id,
    budget_program_identity_id,
    review_status
  );

CREATE INDEX budget_topic_programs_topic_status_idx
  ON public.budget_topic_programs (topic_id, review_status);

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_topic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_topic_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_categories_published_select
ON public.budget_categories
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY budget_topics_published_select
ON public.budget_topics
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY budget_topic_categories_published_select
ON public.budget_topic_categories
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.budget_topics AS topic
    WHERE topic.id = budget_topic_categories.topic_id
      AND topic.status = 'published'
  )
  AND EXISTS (
    SELECT 1
    FROM public.budget_categories AS category
    WHERE category.id = budget_topic_categories.category_id
      AND category.status = 'published'
  )
);

CREATE POLICY budget_topic_programs_published_select
ON public.budget_topic_programs
FOR SELECT
TO anon, authenticated
USING (
  review_status = 'published'
  AND EXISTS (
    SELECT 1
    FROM public.budget_topics AS topic
    WHERE topic.id = budget_topic_programs.topic_id
      AND topic.status = 'published'
  )
  AND EXISTS (
    SELECT 1
    FROM public.budget_datasets AS dataset
    WHERE dataset.id = budget_topic_programs.dataset_id
      AND dataset.status = 'active'
  )
);

REVOKE ALL ON TABLE
  public.budget_categories,
  public.budget_topics,
  public.budget_topic_categories,
  public.budget_topic_programs
FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  slug,
  name,
  short_description,
  sort_order,
  status
)
ON public.budget_categories
TO anon, authenticated;

GRANT SELECT (
  id,
  slug,
  name,
  short_description,
  topic_kind,
  status
)
ON public.budget_topics
TO anon, authenticated;

GRANT SELECT (
  topic_id,
  category_id,
  relevance_weight,
  is_primary
)
ON public.budget_topic_categories
TO anon, authenticated;

GRANT SELECT (
  topic_id,
  dataset_id,
  budget_program_identity_id,
  relation_type,
  explanation,
  evidence_level,
  evidence_fields,
  evidence_source_url,
  review_status,
  reviewed_at
)
ON public.budget_topic_programs
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.budget_categories,
  public.budget_topics,
  public.budget_topic_categories,
  public.budget_topic_programs
TO service_role;

INSERT INTO public.budget_categories (
  id,
  slug,
  name,
  short_description,
  sort_order,
  status
)
VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'education',
    '教育',
    '学校、教育環境、学びの支援',
    1,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'child-rearing',
    '子育て',
    '保育、子どもの権利、妊娠・出産',
    2,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'welfare',
    '福祉',
    '医療、高齢者、介護、生活支援',
    3,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000004',
    'urban-development',
    'まちづくり',
    '都市計画、道路、公園、住宅、交通',
    4,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000005',
    'disaster-prevention',
    '防災',
    '災害対策、避難、防災情報、消防・救急',
    5,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000006',
    'administration-finance',
    '行財政',
    '行政計画、財政、契約、行政DX',
    6,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000007',
    'culture-sports',
    '文化・スポーツ',
    '文化施設、スポーツ、生涯学習、交流',
    7,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000008',
    'industry',
    '産業',
    '商店街、創業、雇用、観光、都市農業',
    8,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000009',
    'environment',
    '環境問題',
    '気候変動、脱炭素、ごみ、農地',
    9,
    'published'
  ),
  (
    'b0000000-0000-4000-8000-000000000010',
    'daily-life',
    '暮らし',
    '区民施設、地域参加、多文化共生、防犯',
    10,
    'published'
  );

COMMENT ON TABLE public.budget_categories IS
  '市民が予算探索を始めるためのみらい議会編集分類。公式の款ではない。';
COMMENT ON TABLE public.budget_topics IS
  '市民目線の課題・目標・行政機能を表す編集データ。';
COMMENT ON COLUMN public.budget_topics.editorial_note IS
  '公開対象外の編集・レビュー用メモ。';
COMMENT ON TABLE public.budget_topic_categories IS
  '課題と市民向け大分類の多対多関係。';
COMMENT ON TABLE public.budget_topic_programs IS
  '課題と版管理された歳出予算事業identityの編集上の関係。金額配分を示さない。';
COMMENT ON COLUMN public.budget_topic_programs.dataset_id IS
  '予算改訂版をまたいだ自動継承や混線を防ぐ版スコープ。';
COMMENT ON COLUMN public.budget_topic_programs.review_status IS
  'approvedは人手確認済みだが非公開、publishedだけが一般公開される。';
COMMENT ON COLUMN public.budget_topic_programs.reviewed_by IS
  '公開対象外のレビュー実施者UUID。個人情報の直接表示には使用しない。';
