CREATE TYPE public.recommendation_source_enum AS ENUM (
  'selected-subcategory',
  'parent-category'
);

CREATE TYPE public.recommendation_display_source_enum AS ENUM (
  'homepage',
  'push'
);

CREATE TYPE public.push_notification_status_enum AS ENUM (
  'processing',
  'sent',
  'skipped',
  'failed',
  'expired'
);

CREATE OR REPLACE FUNCTION public.text_array_has_unique_values(values_to_check TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = ''
AS $$
  SELECT cardinality(values_to_check) = (
    SELECT count(DISTINCT value)
    FROM unnest(values_to_check) AS value
  );
$$;

CREATE OR REPLACE FUNCTION public.uuid_array_has_unique_values(values_to_check UUID[])
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = ''
AS $$
  SELECT cardinality(values_to_check) = (
    SELECT count(DISTINCT value)
    FROM unnest(values_to_check) AS value
  );
$$;

CREATE TABLE public.recommendation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID NOT NULL UNIQUE,
  selected_small_tags TEXT[] NOT NULL,
  selected_parent_category_ids TEXT[] NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  preference_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_profiles_small_tags_count_check
    CHECK (cardinality(selected_small_tags) = 3),
  CONSTRAINT recommendation_profiles_small_tags_unique_check
    CHECK (public.text_array_has_unique_values(selected_small_tags)),
  CONSTRAINT recommendation_profiles_parent_categories_count_check
    CHECK (cardinality(selected_parent_category_ids) BETWEEN 1 AND 3),
  CONSTRAINT recommendation_profiles_parent_categories_unique_check
    CHECK (public.text_array_has_unique_values(selected_parent_category_ids)),
  CONSTRAINT recommendation_profiles_timezone_check
    CHECK (char_length(timezone) BETWEEN 1 AND 64),
  CONSTRAINT recommendation_profiles_preference_version_check
    CHECK (preference_version >= 1)
);

CREATE TRIGGER update_recommendation_profiles_updated_at
  BEFORE UPDATE ON public.recommendation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.daily_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL
    REFERENCES public.recommendation_profiles(id) ON DELETE CASCADE,
  recommendation_date DATE NOT NULL,
  preference_version INTEGER NOT NULL,
  bill_ids UUID[] NOT NULL DEFAULT '{}',
  sources public.recommendation_source_enum[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_recommendations_preference_version_check
    CHECK (preference_version >= 1),
  CONSTRAINT daily_recommendations_bill_count_check
    CHECK (cardinality(bill_ids) <= 5),
  CONSTRAINT daily_recommendations_bill_ids_unique_check
    CHECK (public.uuid_array_has_unique_values(bill_ids)),
  CONSTRAINT daily_recommendations_sources_count_check
    CHECK (cardinality(sources) = cardinality(bill_ids)),
  UNIQUE (profile_id, recommendation_date, preference_version)
);

CREATE INDEX daily_recommendations_profile_date_idx
  ON public.daily_recommendations (profile_id, recommendation_date DESC);

CREATE TABLE public.recommendation_impressions (
  profile_id UUID NOT NULL
    REFERENCES public.recommendation_profiles(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  first_displayed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  display_source public.recommendation_display_source_enum NOT NULL,
  PRIMARY KEY (profile_id, bill_id)
);

CREATE INDEX recommendation_impressions_profile_displayed_idx
  ON public.recommendation_impressions (profile_id, first_displayed_at DESC);

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE
    REFERENCES public.recommendation_profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_notification_date DATE,
  last_notification_status public.push_notification_status_enum,
  last_attempted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_length_check
    CHECK (char_length(endpoint) BETWEEN 1 AND 4096),
  CONSTRAINT push_subscriptions_p256dh_length_check
    CHECK (char_length(p256dh) BETWEEN 16 AND 512),
  CONSTRAINT push_subscriptions_auth_length_check
    CHECK (char_length(auth) BETWEEN 8 AND 256)
);

CREATE INDEX push_subscriptions_enabled_notification_idx
  ON public.push_subscriptions (enabled, last_notification_date)
  WHERE enabled = TRUE;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recommendation_api_rate_limits (
  key_hash TEXT NOT NULL,
  route_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key_hash, route_key, window_start),
  CONSTRAINT recommendation_api_rate_limits_key_hash_check
    CHECK (char_length(key_hash) BETWEEN 32 AND 128),
  CONSTRAINT recommendation_api_rate_limits_route_key_check
    CHECK (char_length(route_key) BETWEEN 1 AND 80),
  CONSTRAINT recommendation_api_rate_limits_count_check
    CHECK (request_count >= 1)
);

CREATE INDEX recommendation_api_rate_limits_updated_at_idx
  ON public.recommendation_api_rate_limits (updated_at);

CREATE OR REPLACE FUNCTION public.save_recommendation_preferences(
  p_installation_id UUID,
  p_selected_small_tags TEXT[],
  p_selected_parent_category_ids TEXT[],
  p_timezone TEXT
)
RETURNS public.recommendation_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_profile public.recommendation_profiles;
BEGIN
  INSERT INTO public.recommendation_profiles (
    installation_id,
    selected_small_tags,
    selected_parent_category_ids,
    timezone
  )
  VALUES (
    p_installation_id,
    p_selected_small_tags,
    p_selected_parent_category_ids,
    p_timezone
  )
  ON CONFLICT (installation_id) DO UPDATE
  SET
    selected_small_tags = EXCLUDED.selected_small_tags,
    selected_parent_category_ids = EXCLUDED.selected_parent_category_ids,
    timezone = EXCLUDED.timezone,
    preference_version = CASE
      WHEN public.recommendation_profiles.selected_small_tags
          IS DISTINCT FROM EXCLUDED.selected_small_tags
        OR public.recommendation_profiles.selected_parent_category_ids
          IS DISTINCT FROM EXCLUDED.selected_parent_category_ids
        OR public.recommendation_profiles.timezone
          IS DISTINCT FROM EXCLUDED.timezone
      THEN public.recommendation_profiles.preference_version + 1
      ELSE public.recommendation_profiles.preference_version
    END,
    updated_at = now()
  RETURNING * INTO saved_profile;

  RETURN saved_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_recommendation_history(
  p_installation_id UUID
)
RETURNS public.recommendation_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_profile public.recommendation_profiles;
BEGIN
  SELECT *
  INTO target_profile
  FROM public.recommendation_profiles
  WHERE installation_id = p_installation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.recommendation_impressions
  WHERE profile_id = target_profile.id;

  DELETE FROM public.daily_recommendations
  WHERE profile_id = target_profile.id;

  UPDATE public.recommendation_profiles
  SET
    preference_version = preference_version + 1,
    updated_at = now()
  WHERE id = target_profile.id
  RETURNING * INTO target_profile;

  RETURN target_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_push_subscriptions(
  p_recommendation_date DATE,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  subscription_id UUID,
  profile_id UUID,
  endpoint TEXT,
  p256dh TEXT,
  auth TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 500 THEN
    RAISE EXCEPTION 'p_limit must be between 1 and 500';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT subscriptions.id
    FROM public.push_subscriptions AS subscriptions
    WHERE subscriptions.enabled = TRUE
      AND (
        subscriptions.last_notification_date IS NULL
        OR subscriptions.last_notification_date < p_recommendation_date
      )
    ORDER BY subscriptions.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ),
  updated AS (
    UPDATE public.push_subscriptions AS subscriptions
    SET
      last_notification_date = p_recommendation_date,
      last_notification_status = 'processing',
      last_attempted_at = now(),
      updated_at = now()
    FROM claimed
    WHERE subscriptions.id = claimed.id
    RETURNING
      subscriptions.id,
      subscriptions.profile_id,
      subscriptions.endpoint,
      subscriptions.p256dh,
      subscriptions.auth
  )
  SELECT
    updated.id,
    updated.profile_id,
    updated.endpoint,
    updated.p256dh,
    updated.auth
  FROM updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_profile_id UUID,
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT
)
RETURNS public.push_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_subscription public.push_subscriptions;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_endpoint, 0)
  );

  PERFORM 1
  FROM public.recommendation_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE profile_id = p_profile_id
    OR endpoint = p_endpoint;

  INSERT INTO public.push_subscriptions (
    profile_id,
    endpoint,
    p256dh,
    auth,
    enabled
  )
  VALUES (
    p_profile_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    TRUE
  )
  RETURNING * INTO saved_subscription;

  RETURN saved_subscription;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_recommendation_rate_limit(
  p_key_hash TEXT,
  p_route_key TEXT,
  p_window_start TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF p_limit < 1 THEN
    RAISE EXCEPTION 'p_limit must be positive';
  END IF;

  DELETE FROM public.recommendation_api_rate_limits
  WHERE updated_at < now() - INTERVAL '2 days';

  INSERT INTO public.recommendation_api_rate_limits (
    key_hash,
    route_key,
    window_start,
    request_count
  )
  VALUES (p_key_hash, p_route_key, p_window_start, 1)
  ON CONFLICT (key_hash, route_key, window_start) DO UPDATE
  SET
    request_count =
      public.recommendation_api_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

ALTER TABLE public.recommendation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.text_array_has_unique_values(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uuid_array_has_unique_values(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_recommendation_preferences(
  UUID,
  TEXT[],
  TEXT[],
  TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_recommendation_history(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_push_subscriptions(DATE, INTEGER)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_push_subscription(
  UUID,
  TEXT,
  TEXT,
  TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_recommendation_rate_limit(
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  INTEGER
) FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.recommendation_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.daily_recommendations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.recommendation_impressions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.push_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.recommendation_api_rate_limits TO service_role;

GRANT EXECUTE ON FUNCTION public.text_array_has_unique_values(TEXT[])
  TO service_role;
GRANT EXECUTE ON FUNCTION public.uuid_array_has_unique_values(UUID[])
  TO service_role;
GRANT EXECUTE ON FUNCTION public.save_recommendation_preferences(
  UUID,
  TEXT[],
  TEXT[],
  TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_recommendation_history(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_daily_push_subscriptions(DATE, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(
  UUID,
  TEXT,
  TEXT,
  TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_recommendation_rate_limit(
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  INTEGER
) TO service_role;

COMMENT ON TABLE public.recommendation_profiles IS
  'ログイン不要のおすすめ機能で使う匿名ブラウザプロフィール';
COMMENT ON COLUMN public.recommendation_profiles.installation_id IS
  'ブラウザ内で生成した匿名UUID。URLには露出させない';
COMMENT ON TABLE public.daily_recommendations IS
  'JST日付と設定バージョンごとに固定した最大5件のおすすめ';
COMMENT ON TABLE public.recommendation_impressions IS
  'トップページまたはPush通知で実際に表示した案件の初回履歴';
COMMENT ON TABLE public.push_subscriptions IS
  'Web Pushに必要な匿名購読情報。秘密値をログへ出さない';
COMMENT ON TABLE public.recommendation_api_rate_limits IS
  'HMAC化した短期キーによる匿名APIの固定窓レート制限';
