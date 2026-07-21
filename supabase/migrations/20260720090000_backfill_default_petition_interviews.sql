-- 全案件で請願下書き用のAIインタビューを標準ONにする。
-- 既存案件は公開中の設定を再利用し、なければ最新設定を公開化し、それもなければ新規作成する。

ALTER TABLE public.bills
  ALTER COLUMN interview_enabled SET DEFAULT true;

UPDATE public.bills
SET interview_enabled = true
WHERE interview_enabled IS DISTINCT FROM true;

CREATE TEMP TABLE tmp_default_petition_interview_configs (
  bill_id uuid PRIMARY KEY,
  config_id uuid NOT NULL
) ON COMMIT DROP;

-- status=public の既存設定は、deleted_at が付いていても「全案件ON」方針に合わせて復活させる。
WITH existing_public AS (
  SELECT bill_id, id
  FROM public.interview_configs
  WHERE status = 'public'
),
updated_public AS (
  UPDATE public.interview_configs c
  SET
    name = '請願下書き用AIインタビュー',
    themes = ARRAY[
      '請願の件名と要旨',
      '請願理由',
      '地域・公益への影響',
      '請願事項'
    ],
    mode = 'loop',
    estimated_duration = 8,
    deleted_at = NULL,
    updated_at = now()
  FROM existing_public ep
  WHERE c.id = ep.id
  RETURNING c.bill_id, c.id
)
INSERT INTO tmp_default_petition_interview_configs (bill_id, config_id)
SELECT bill_id, id
FROM updated_public
ON CONFLICT (bill_id) DO UPDATE
SET config_id = EXCLUDED.config_id;

-- public設定がまだない案件は、既存の最新設定を公開化して使う。
WITH latest_non_public AS (
  SELECT DISTINCT ON (c.bill_id)
    c.bill_id,
    c.id
  FROM public.interview_configs c
  LEFT JOIN tmp_default_petition_interview_configs t
    ON t.bill_id = c.bill_id
  WHERE t.bill_id IS NULL
    AND c.deleted_at IS NULL
  ORDER BY c.bill_id, c.updated_at DESC, c.created_at DESC
),
promoted AS (
  UPDATE public.interview_configs c
  SET
    name = '請願下書き用AIインタビュー',
    status = 'public',
    themes = ARRAY[
      '請願の件名と要旨',
      '請願理由',
      '地域・公益への影響',
      '請願事項'
    ],
    mode = 'loop',
    estimated_duration = 8,
    deleted_at = NULL,
    updated_at = now()
  FROM latest_non_public l
  WHERE c.id = l.id
  RETURNING c.bill_id, c.id
)
INSERT INTO tmp_default_petition_interview_configs (bill_id, config_id)
SELECT bill_id, id
FROM promoted
ON CONFLICT (bill_id) DO UPDATE
SET config_id = EXCLUDED.config_id;

-- 設定自体がない案件は新規作成する。
WITH created AS (
  INSERT INTO public.interview_configs (
    bill_id,
    name,
    status,
    themes,
    mode,
    estimated_duration,
    updated_at
  )
  SELECT
    b.id,
    '請願下書き用AIインタビュー',
    'public',
    ARRAY[
      '請願の件名と要旨',
      '請願理由',
      '地域・公益への影響',
      '請願事項'
    ],
    'loop',
    8,
    now()
  FROM public.bills b
  LEFT JOIN tmp_default_petition_interview_configs t
    ON t.bill_id = b.id
  WHERE t.bill_id IS NULL
  RETURNING bill_id, id
)
INSERT INTO tmp_default_petition_interview_configs (bill_id, config_id)
SELECT bill_id, id
FROM created
ON CONFLICT (bill_id) DO UPDATE
SET config_id = EXCLUDED.config_id;

-- 共通テンプレートに統一するため、対象設定の質問は一度入れ替える。
DELETE FROM public.interview_questions q
USING tmp_default_petition_interview_configs t
WHERE q.interview_config_id = t.config_id;

INSERT INTO public.interview_questions (
  interview_config_id,
  question,
  follow_up_guide,
  quick_replies,
  question_order,
  updated_at
)
SELECT
  t.config_id,
  q.question,
  q.follow_up_guide,
  q.quick_replies,
  q.question_order,
  now()
FROM tmp_default_petition_interview_configs t
CROSS JOIN (
  VALUES
    (
      'この案件について、区議会や区に一番お願いしたいことは何ですか？',
      '請願の件名と要旨の核を作るため、制度改善、予算措置、慎重な進行、説明強化など、求めたい方向性を本人の言葉で具体化する。',
      ARRAY['制度を改善してほしい', '予算をつけてほしい', '説明を増やしてほしい']::text[],
      1
    ),
    (
      'そうお願いしたい理由や、困っていること・不安に思うことは何ですか？',
      '請願理由を作るため、個人的な体験、周囲で見聞きしたこと、地域で起きそうな問題を丁寧に引き出す。',
      ARRAY['生活で困っている', '地域で不安がある', '周りで聞いたことがある']::text[],
      2
    ),
    (
      'このお願いが実現すると、誰にどんな良い影響がありますか？逆に実現しないと何が心配ですか？',
      '個人の要望だけでなく、地域全体や公益性のある請願文に整えるため、影響を受ける人、改善されること、放置した場合の心配を整理する。',
      ARRAY['区民全体に影響がある', '特定の人が助かる', '実現しないと心配']::text[],
      3
    ),
    (
      '請願事項として、区議会や区に求める具体的な対応を1〜3個に絞るなら何ですか？',
      'PDFやGoogle Docsに載せる請願事項を箇条書きにするため、対象者拡大、情報提供強化、予算措置、継続審査など具体的な対応へ絞る。',
      ARRAY['情報提供を強化する', '予算措置を検討する', '継続審査してほしい']::text[],
      4
    )
) AS q(question, follow_up_guide, quick_replies, question_order);
