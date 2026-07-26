CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TYPE public.council_search_chunk_kind AS ENUM (
  'overview',
  'content',
  'councilor_statement'
);

CREATE TABLE public.council_search_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  diet_session_id UUID NOT NULL
    REFERENCES public.diet_sessions(id) ON DELETE CASCADE,
  chunk_key TEXT NOT NULL,
  chunk_kind public.council_search_chunk_kind NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  councilor_id UUID REFERENCES public.councilors(id) ON DELETE SET NULL,
  councilor_name TEXT,
  item_type public.bill_item_type NOT NULL,
  major_category TEXT,
  committee_name TEXT,
  embedding extensions.vector(512) NOT NULL,
  content_hash TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT council_search_chunks_chunk_key_length_check
    CHECK (char_length(chunk_key) BETWEEN 1 AND 160),
  CONSTRAINT council_search_chunks_content_length_check
    CHECK (char_length(content) BETWEEN 1 AND 4000),
  CONSTRAINT council_search_chunks_content_hash_length_check
    CHECK (char_length(content_hash) = 64),
  UNIQUE (bill_id, chunk_key)
);

CREATE INDEX council_search_chunks_bill_id_idx
  ON public.council_search_chunks (bill_id);
CREATE INDEX council_search_chunks_diet_session_id_idx
  ON public.council_search_chunks (diet_session_id);
CREATE INDEX council_search_chunks_councilor_id_idx
  ON public.council_search_chunks (councilor_id)
  WHERE councilor_id IS NOT NULL;
CREATE INDEX council_search_chunks_embedding_hnsw_idx
  ON public.council_search_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX council_search_chunks_normalized_content_trgm_idx
  ON public.council_search_chunks
  USING gin (normalized_content extensions.gin_trgm_ops);

CREATE TRIGGER update_council_search_chunks_updated_at
  BEFORE UPDATE ON public.council_search_chunks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.council_search_index_jobs (
  bill_id UUID PRIMARY KEY REFERENCES public.bills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT council_search_index_jobs_status_check
    CHECK (status IN ('pending', 'processing', 'failed')),
  CONSTRAINT council_search_index_jobs_attempt_count_check
    CHECK (attempt_count BETWEEN 0 AND 20),
  CONSTRAINT council_search_index_jobs_last_error_length_check
    CHECK (last_error IS NULL OR char_length(last_error) <= 500)
);

CREATE INDEX council_search_index_jobs_claim_idx
  ON public.council_search_index_jobs (status, available_at, requested_at);

CREATE TRIGGER update_council_search_index_jobs_updated_at
  BEFORE UPDATE ON public.council_search_index_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enqueue_council_search_index_job(
  p_bill_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_bill_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.council_search_index_jobs (
    bill_id,
    status,
    attempt_count,
    requested_at,
    available_at,
    locked_at,
    last_error
  )
  VALUES (
    p_bill_id,
    'pending',
    0,
    now(),
    now(),
    NULL,
    NULL
  )
  ON CONFLICT (bill_id) DO UPDATE
  SET
    status = 'pending',
    attempt_count = 0,
    requested_at = now(),
    available_at = now(),
    locked_at = NULL,
    last_error = NULL,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_council_search_bill_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.enqueue_council_search_index_job(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_council_search_related_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_bill_id UUID;
  new_bill_id UUID;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    old_bill_id := OLD.bill_id;
  END IF;
  IF TG_OP <> 'DELETE' THEN
    new_bill_id := NEW.bill_id;
  END IF;

  IF TG_TABLE_NAME IN ('bill_contents', 'councilor_bill_statements') THEN
    IF TG_OP = 'INSERT' AND NEW.difficulty_level <> 'normal' THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' AND OLD.difficulty_level <> 'normal' THEN
      RETURN OLD;
    END IF;
    IF TG_OP = 'UPDATE'
      AND OLD.difficulty_level <> 'normal'
      AND NEW.difficulty_level <> 'normal'
    THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.enqueue_council_search_index_job(old_bill_id);
  IF new_bill_id IS DISTINCT FROM old_bill_id THEN
    PERFORM public.enqueue_council_search_index_job(new_bill_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_council_search_tag_rows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_bill_id UUID;
BEGIN
  IF
    OLD.label IS NOT DISTINCT FROM NEW.label
    AND OLD.description IS NOT DISTINCT FROM NEW.description
    AND OLD.major_category IS NOT DISTINCT FROM NEW.major_category
  THEN
    RETURN NEW;
  END IF;

  FOR target_bill_id IN
    SELECT relation.bill_id
    FROM public.bills_tags AS relation
    WHERE relation.tag_id = NEW.id
  LOOP
    PERFORM public.enqueue_council_search_index_job(target_bill_id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_council_search_session_rows()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_bill_id UUID;
BEGIN
  IF
    OLD.start_date IS NOT DISTINCT FROM NEW.start_date
    AND OLD.end_date IS NOT DISTINCT FROM NEW.end_date
  THEN
    RETURN NEW;
  END IF;

  FOR target_bill_id IN
    SELECT bill.id
    FROM public.bills AS bill
    WHERE bill.diet_session_id = NEW.id
  LOOP
    PERFORM public.enqueue_council_search_index_job(target_bill_id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER queue_council_search_bills
  AFTER INSERT OR UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.queue_council_search_bill_row();

CREATE TRIGGER queue_council_search_bill_contents
  AFTER INSERT OR UPDATE OR DELETE ON public.bill_contents
  FOR EACH ROW EXECUTE FUNCTION public.queue_council_search_related_row();

CREATE TRIGGER queue_council_search_bill_tags
  AFTER INSERT OR UPDATE OR DELETE ON public.bills_tags
  FOR EACH ROW EXECUTE FUNCTION public.queue_council_search_related_row();

CREATE TRIGGER queue_council_search_councilor_statements
  AFTER INSERT OR UPDATE OR DELETE ON public.councilor_bill_statements
  FOR EACH ROW EXECUTE FUNCTION public.queue_council_search_related_row();

CREATE TRIGGER queue_council_search_tags
  AFTER UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.queue_council_search_tag_rows();

CREATE TRIGGER queue_council_search_sessions
  AFTER UPDATE ON public.diet_sessions
  FOR EACH ROW EXECUTE FUNCTION public.queue_council_search_session_rows();

CREATE OR REPLACE FUNCTION public.claim_council_search_index_jobs(
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  bill_id UUID,
  requested_at TIMESTAMPTZ,
  attempt_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 50';
  END IF;

  RETURN QUERY
  WITH claimable AS (
    SELECT job.bill_id
    FROM public.council_search_index_jobs AS job
    WHERE (
      job.status = 'pending'
      AND job.available_at <= now()
    ) OR (
      job.status = 'processing'
      AND job.locked_at < now() - INTERVAL '10 minutes'
    )
    ORDER BY job.requested_at, job.bill_id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.council_search_index_jobs AS job
  SET
    status = 'processing',
    attempt_count = job.attempt_count + 1,
    locked_at = now(),
    updated_at = now()
  FROM claimable
  WHERE job.bill_id = claimable.bill_id
  RETURNING job.bill_id, job.requested_at, job.attempt_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_council_bills(
  p_query_embedding extensions.vector(512),
  p_query_terms TEXT[],
  p_diet_session_ids UUID[],
  p_content_type public.bill_item_type,
  p_major_category TEXT,
  p_committee_name TEXT,
  p_councilor_ids UUID[],
  p_councilor_names TEXT[],
  p_similarity_threshold REAL,
  p_limit INTEGER
)
RETURNS TABLE (
  bill_id UUID,
  score DOUBLE PRECISION,
  semantic_similarity DOUBLE PRECISION,
  keyword_score DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 50';
  END IF;
  IF cardinality(p_diet_session_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH base_bills AS (
    SELECT
      bill.id,
      bill.name,
      bill.item_type,
      bill.major_category,
      bill.status_note,
      bill.submitted_date,
      content.title,
      content.summary,
      content.content,
      COALESCE((
        SELECT string_agg(
          concat_ws(' ', tag.label, tag.major_category, tag.description),
          ' '
        )
        FROM public.bills_tags AS relation
        JOIN public.tags AS tag ON tag.id = relation.tag_id
        WHERE relation.bill_id = bill.id
      ), '') AS tag_text,
      COALESCE((
        SELECT string_agg(
          concat_ws(
            ' ',
            statement.councilor_name,
            statement.party_or_group,
            statement.content_text
          ),
          ' '
        )
        FROM public.councilor_bill_statements AS statement
        WHERE statement.bill_id = bill.id
          AND statement.difficulty_level = 'normal'
      ), '') AS statement_text,
      (
        COALESCE(cardinality(p_councilor_ids), 0) > 0
        OR COALESCE(cardinality(p_councilor_names), 0) > 0
      ) AS has_councilor_filter,
      EXISTS (
        SELECT 1
        FROM public.councilor_bill_statements AS statement
        WHERE statement.bill_id = bill.id
          AND statement.difficulty_level = 'normal'
          AND (
            statement.councilor_id = ANY(COALESCE(p_councilor_ids, '{}'))
            OR lower(regexp_replace(
              statement.councilor_name,
              '[[:space:]　]+',
              '',
              'g'
            )) = ANY(COALESCE(p_councilor_names, '{}'))
          )
      ) AS speaker_match
    FROM public.bills AS bill
    JOIN public.bill_contents AS content
      ON content.bill_id = bill.id
      AND content.difficulty_level = 'normal'
    WHERE bill.publish_status = 'published'
      AND bill.diet_session_id = ANY(p_diet_session_ids)
      AND (p_content_type IS NULL OR bill.item_type = p_content_type)
      AND (
        p_major_category IS NULL
        OR bill.major_category = p_major_category
        OR EXISTS (
          SELECT 1
          FROM public.bills_tags AS relation
          JOIN public.tags AS tag ON tag.id = relation.tag_id
          WHERE relation.bill_id = bill.id
            AND tag.major_category = p_major_category
        )
      )
      AND (
        p_committee_name IS NULL
        OR position(
          lower(p_committee_name)
          IN lower(COALESCE(bill.status_note, ''))
        ) > 0
      )
      AND (
        (
          COALESCE(cardinality(p_councilor_ids), 0) = 0
          AND COALESCE(cardinality(p_councilor_names), 0) = 0
        )
        OR EXISTS (
          SELECT 1
          FROM public.councilor_bill_statements AS statement
          WHERE statement.bill_id = bill.id
            AND statement.difficulty_level = 'normal'
            AND (
              statement.councilor_id = ANY(
                COALESCE(p_councilor_ids, '{}')
              )
              OR lower(regexp_replace(
                statement.councilor_name,
                '[[:space:]　]+',
                '',
                'g'
              )) = ANY(COALESCE(p_councilor_names, '{}'))
            )
        )
      )
  ),
  keyword_scores AS (
    SELECT
      base.id AS bill_id,
      sum(
        greatest(
          CASE
            WHEN lower(COALESCE(base.title, '')) = term THEN 28
            WHEN position(term IN lower(COALESCE(base.title, ''))) > 0 THEN 18
            ELSE 0
          END,
          CASE
            WHEN lower(base.name) = term THEN 24
            WHEN position(term IN lower(base.name)) > 0 THEN 14
            ELSE 0
          END,
          CASE
            WHEN position(term IN lower(base.tag_text)) > 0 THEN 12
            ELSE 0
          END,
          CASE
            WHEN position(
              term IN lower(COALESCE(base.major_category, ''))
            ) > 0 THEN 11
            ELSE 0
          END,
          CASE
            WHEN position(term IN lower(COALESCE(base.status_note, ''))) > 0
              THEN 10
            ELSE 0
          END,
          CASE
            WHEN position(term IN lower(base.statement_text)) > 0 THEN 9
            ELSE 0
          END,
          CASE
            WHEN position(term IN lower(COALESCE(base.summary, ''))) > 0
              THEN 6
            ELSE 0
          END,
          CASE
            WHEN position(term IN lower(COALESCE(base.content, ''))) > 0
              THEN 3
            ELSE 0
          END
        )
      )::DOUBLE PRECISION AS keyword_score
    FROM base_bills AS base
    CROSS JOIN LATERAL unnest(COALESCE(p_query_terms, '{}')) AS term
    WHERE char_length(term) >= 2
    GROUP BY base.id
    HAVING sum(
      CASE
        WHEN position(term IN lower(concat_ws(
          ' ',
          base.name,
          base.title,
          base.summary,
          base.content,
          base.major_category,
          base.status_note,
          base.tag_text,
          base.statement_text
        ))) > 0 THEN 1
        ELSE 0
      END
    ) > 0
  ),
  semantic_scores AS (
    SELECT
      chunk.bill_id,
      max(
        1 - (
          chunk.embedding
          OPERATOR(extensions.<=>)
          p_query_embedding
        )
      )::DOUBLE PRECISION AS semantic_similarity
    FROM public.council_search_chunks AS chunk
    JOIN base_bills AS base ON base.id = chunk.bill_id
    WHERE p_query_embedding IS NOT NULL
    GROUP BY chunk.bill_id
    HAVING max(
      1 - (
        chunk.embedding
        OPERATOR(extensions.<=>)
        p_query_embedding
      )
    ) >= p_similarity_threshold
  ),
  keyword_ranked AS (
    SELECT
      candidate.bill_id,
      candidate.keyword_score,
      row_number() OVER (
        ORDER BY candidate.keyword_score DESC, candidate.bill_id
      ) AS rank
    FROM keyword_scores AS candidate
  ),
  semantic_ranked AS (
    SELECT
      candidate.bill_id,
      candidate.semantic_similarity,
      row_number() OVER (
        ORDER BY candidate.semantic_similarity DESC, candidate.bill_id
      ) AS rank
    FROM semantic_scores AS candidate
  ),
  candidate_ids AS (
    SELECT candidate.bill_id FROM keyword_ranked AS candidate
    UNION
    SELECT candidate.bill_id FROM semantic_ranked AS candidate
    UNION
    SELECT base.id
    FROM base_bills AS base
    WHERE base.has_councilor_filter AND base.speaker_match
  ),
  scored AS (
    SELECT
      candidate.bill_id,
      (
        COALESCE(1.4 / (60 + keyword.rank), 0)
        + COALESCE(1.0 / (60 + semantic.rank), 0)
        + CASE
          WHEN base.has_councilor_filter AND base.speaker_match
            THEN 2.0 / 61
          ELSE 0
        END
      )::DOUBLE PRECISION AS combined_score,
      COALESCE(semantic.semantic_similarity, 0)::DOUBLE PRECISION
        AS semantic_similarity,
      COALESCE(keyword.keyword_score, 0)::DOUBLE PRECISION AS keyword_score,
      base.submitted_date
    FROM candidate_ids AS candidate
    JOIN base_bills AS base ON base.id = candidate.bill_id
    LEFT JOIN keyword_ranked AS keyword
      ON keyword.bill_id = candidate.bill_id
    LEFT JOIN semantic_ranked AS semantic
      ON semantic.bill_id = candidate.bill_id
  )
  SELECT
    candidate.bill_id,
    candidate.combined_score,
    candidate.semantic_similarity,
    candidate.keyword_score
  FROM scored AS candidate
  ORDER BY
    candidate.combined_score DESC,
    candidate.keyword_score DESC,
    candidate.semantic_similarity DESC,
    candidate.submitted_date DESC NULLS LAST,
    candidate.bill_id
  LIMIT p_limit;
END;
$$;

ALTER TABLE public.council_search_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_search_index_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.enqueue_council_search_index_job(UUID)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_council_search_bill_row()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_council_search_related_row()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_council_search_tag_rows()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_council_search_session_rows()
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_council_search_index_jobs(INTEGER)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_council_bills(
  extensions.vector,
  TEXT[],
  UUID[],
  public.bill_item_type,
  TEXT,
  TEXT,
  UUID[],
  TEXT[],
  REAL,
  INTEGER
) FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.council_search_chunks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.council_search_index_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_council_search_index_job(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_council_search_index_jobs(INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.search_council_bills(
  extensions.vector,
  TEXT[],
  UUID[],
  public.bill_item_type,
  TEXT,
  TEXT,
  UUID[],
  TEXT[],
  REAL,
  INTEGER
) TO service_role;

INSERT INTO public.council_search_index_jobs (bill_id)
SELECT bill.id
FROM public.bills AS bill
JOIN public.diet_sessions AS session
  ON session.id = bill.diet_session_id
WHERE bill.publish_status = 'published'
  AND EXTRACT(YEAR FROM session.start_date) = EXTRACT(
    YEAR FROM (now() AT TIME ZONE 'Asia/Tokyo')
  )
ON CONFLICT (bill_id) DO UPDATE
SET
  status = 'pending',
  attempt_count = 0,
  requested_at = now(),
  available_at = now(),
  locked_at = NULL,
  last_error = NULL,
  updated_at = now();

COMMENT ON TABLE public.council_search_chunks IS
  '公開済みの今年案件を自然文検索するための本文・議員発言Embeddingチャンク';
COMMENT ON TABLE public.council_search_index_jobs IS
  '案件変更をEmbedding索引へ反映するための再試行可能な更新キュー';
COMMENT ON FUNCTION public.search_council_bills(
  extensions.vector,
  TEXT[],
  UUID[],
  public.bill_item_type,
  TEXT,
  TEXT,
  UUID[],
  TEXT[],
  REAL,
  INTEGER
) IS
  '今年の公開案件をキーワード・意味類似度・議員発言一致のRRFで検索する';
COMMENT ON TABLE public.recommendation_api_rate_limits IS
  'HMAC化した短期キーによる匿名公開APIの固定窓レート制限';
