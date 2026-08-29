CREATE TABLE public.bill_seo_profiles (
  bill_id UUID PRIMARY KEY REFERENCES public.bills(id) ON DELETE CASCADE,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  source_hash TEXT,
  generated_at TIMESTAMPTZ,
  generation_started_at TIMESTAMPTZ,
  model TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bill_seo_profiles_title_length
    CHECK (seo_title IS NULL OR char_length(seo_title) <= 47),
  CONSTRAINT bill_seo_profiles_description_length
    CHECK (seo_description IS NULL OR char_length(seo_description) <= 160),
  CONSTRAINT bill_seo_profiles_keyword_count
    CHECK (cardinality(seo_keywords) <= 8)
);

CREATE INDEX bill_seo_profiles_status_idx
  ON public.bill_seo_profiles(status, updated_at DESC);

CREATE TABLE public.bill_seo_generation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  source_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0 CHECK (cost_usd >= 0),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bill_seo_generation_events_created_at_idx
  ON public.bill_seo_generation_events(created_at DESC);

CREATE INDEX bill_seo_generation_events_bill_id_idx
  ON public.bill_seo_generation_events(bill_id, created_at DESC);

CREATE TRIGGER update_bill_seo_profiles_updated_at
  BEFORE UPDATE ON public.bill_seo_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bill_seo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_seo_generation_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_bill_seo_generation(
  p_bill_id UUID,
  p_source_hash TEXT,
  p_force BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claimed_bill_id UUID;
BEGIN
  IF p_bill_id IS NULL OR nullif(trim(p_source_hash), '') IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.bill_seo_profiles (
    bill_id,
    status,
    source_hash,
    generation_started_at,
    last_error
  )
  VALUES (
    p_bill_id,
    'generating',
    p_source_hash,
    now(),
    NULL
  )
  ON CONFLICT (bill_id) DO NOTHING
  RETURNING bill_id INTO claimed_bill_id;

  IF claimed_bill_id IS NOT NULL THEN
    RETURN true;
  END IF;

  UPDATE public.bill_seo_profiles
  SET
    status = 'generating',
    source_hash = p_source_hash,
    generation_started_at = now(),
    last_error = NULL
  WHERE bill_id = p_bill_id
    AND (
      source_hash IS DISTINCT FROM p_source_hash
      OR status IN ('pending', 'failed')
      OR (
        status = 'generating'
        AND generation_started_at < now() - interval '5 minutes'
      )
      OR (p_force AND status <> 'generating')
    )
  RETURNING bill_id INTO claimed_bill_id;

  RETURN claimed_bill_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_bill_seo_generation(UUID, TEXT, BOOLEAN)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_bill_seo_generation(UUID, TEXT, BOOLEAN)
  FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_bill_seo_generation(UUID, TEXT, BOOLEAN)
  TO service_role;

CREATE OR REPLACE FUNCTION public.queue_council_search_bill_seo_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status <> 'ready' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'ready'
      AND OLD.seo_keywords IS NOT DISTINCT FROM NEW.seo_keywords
    THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.enqueue_council_search_index_job(NEW.bill_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER queue_council_search_on_bill_seo_ready
  AFTER INSERT OR UPDATE OF status, seo_keywords
  ON public.bill_seo_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_council_search_bill_seo_profile();

COMMENT ON TABLE public.bill_seo_profiles IS
  '公開案件のAI生成SEOタイトル、説明文、内部検索キーワードを案件ごとに保持する';

COMMENT ON TABLE public.bill_seo_generation_events IS
  '案件SEO生成の成否、トークン数、推定またはGateway報告コストを監査する';

COMMENT ON FUNCTION public.claim_bill_seo_generation(UUID, TEXT, BOOLEAN) IS
  '同一案件・同一ソースのSEO生成を排他的に開始し、完了済みなら再生成を省略する';
