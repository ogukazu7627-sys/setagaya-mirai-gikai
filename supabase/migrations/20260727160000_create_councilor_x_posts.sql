-- 世田谷区議会議員の公開X投稿を、公式埋め込みに必要な最小情報だけ保持する。

CREATE TABLE public.councilor_x_sync_states (
  councilor_id UUID PRIMARY KEY
    REFERENCES public.councilors(id) ON DELETE CASCADE,
  x_username TEXT NOT NULL,
  x_user_id TEXT,
  last_seen_post_id TEXT,
  last_successful_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT councilor_x_sync_states_username_format
    CHECK (x_username ~ '^[A-Za-z0-9_]{1,15}$'),
  CONSTRAINT councilor_x_sync_states_user_id_format
    CHECK (x_user_id IS NULL OR x_user_id ~ '^[0-9]{1,19}$'),
  CONSTRAINT councilor_x_sync_states_post_id_format
    CHECK (
      last_seen_post_id IS NULL
      OR last_seen_post_id ~ '^[0-9]{1,19}$'
    )
);

CREATE UNIQUE INDEX idx_councilor_x_sync_states_username
  ON public.councilor_x_sync_states (LOWER(x_username));

CREATE UNIQUE INDEX idx_councilor_x_sync_states_user_id
  ON public.councilor_x_sync_states (x_user_id)
  WHERE x_user_id IS NOT NULL;

CREATE TRIGGER update_councilor_x_sync_states_updated_at
  BEFORE UPDATE ON public.councilor_x_sync_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.councilor_x_sync_states ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.councilor_x_sync_states IS
  '議員XアカウントのAPI同期位置。X APIはサーバー側からのみ利用する。';
COMMENT ON COLUMN public.councilor_x_sync_states.x_user_id IS
  'X APIが返す不変のUser ID。JavaScriptでは文字列として扱う。';
COMMENT ON COLUMN public.councilor_x_sync_states.last_seen_post_id IS
  '次回のsince_idに使う、取得済みの最新対象投稿ID。';

CREATE TABLE public.councilor_x_posts (
  post_id TEXT PRIMARY KEY,
  councilor_id UUID NOT NULL
    REFERENCES public.councilors(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  post_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT councilor_x_posts_post_id_format
    CHECK (post_id ~ '^[0-9]{1,19}$'),
  CONSTRAINT councilor_x_posts_post_type
    CHECK (post_type IN ('original', 'quote')),
  CONSTRAINT councilor_x_posts_post_url
    CHECK (post_url ~ '^https://x\.com/[A-Za-z0-9_]{1,15}/status/[0-9]{1,19}$')
);

CREATE INDEX idx_councilor_x_posts_posted_at
  ON public.councilor_x_posts (posted_at DESC, post_id DESC);

CREATE INDEX idx_councilor_x_posts_councilor_id
  ON public.councilor_x_posts (councilor_id);

CREATE TRIGGER update_councilor_x_posts_updated_at
  BEFORE UPDATE ON public.councilor_x_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.councilor_x_posts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.councilor_x_posts IS
  'ホームで公式Embedded Postを生成するための最新X投稿ID。最大50件。';
COMMENT ON COLUMN public.councilor_x_posts.post_type IS
  '通常投稿はoriginal、引用投稿はquote。返信と単純リポストは保存しない。';

REVOKE ALL ON TABLE public.councilor_x_sync_states
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.councilor_x_posts
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.councilor_x_sync_states
  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.councilor_x_posts
  TO service_role;

CREATE OR REPLACE FUNCTION public.persist_councilor_x_post_sync(
  p_active_accounts JSONB,
  p_posts JSONB,
  p_sync_states JSONB,
  p_synced_at TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(stored_count INTEGER, deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_pruned_count INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_active_accounts) <> 'array'
    OR jsonb_typeof(p_posts) <> 'array'
    OR jsonb_typeof(p_sync_states) <> 'array'
  THEN
    RAISE EXCEPTION
      'p_active_accounts, p_posts and p_sync_states must be JSON arrays';
  END IF;

  DELETE FROM public.councilor_x_sync_states AS state
  WHERE NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_active_accounts) AS account
    WHERE (account->>'councilor_id')::UUID = state.councilor_id
      AND LOWER(account->>'x_username') = LOWER(state.x_username)
  );

  DELETE FROM public.councilor_x_posts AS post
  WHERE NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_active_accounts) AS account
    WHERE (account->>'councilor_id')::UUID = post.councilor_id
      AND LOWER(account->>'x_username')
        = LOWER(SPLIT_PART(post.post_url, '/', 4))
  );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  INSERT INTO public.councilor_x_posts (
    post_id,
    councilor_id,
    post_url,
    posted_at,
    post_type
  )
  SELECT
    item->>'post_id',
    (item->>'councilor_id')::UUID,
    item->>'post_url',
    (item->>'posted_at')::TIMESTAMP WITH TIME ZONE,
    item->>'post_type'
  FROM jsonb_array_elements(p_posts) AS item
  ON CONFLICT (post_id) DO UPDATE SET
    councilor_id = EXCLUDED.councilor_id,
    post_url = EXCLUDED.post_url,
    posted_at = EXCLUDED.posted_at,
    post_type = EXCLUDED.post_type;

  INSERT INTO public.councilor_x_sync_states AS existing (
    councilor_id,
    x_username,
    x_user_id,
    last_seen_post_id,
    last_successful_sync_at
  )
  SELECT
    (item->>'councilor_id')::UUID,
    item->>'x_username',
    NULLIF(item->>'x_user_id', ''),
    NULLIF(item->>'last_seen_post_id', ''),
    p_synced_at
  FROM jsonb_array_elements(p_sync_states) AS item
  ON CONFLICT (councilor_id) DO UPDATE SET
    x_username = EXCLUDED.x_username,
    x_user_id = CASE
      WHEN LOWER(EXCLUDED.x_username)
        <> LOWER(existing.x_username)
        THEN EXCLUDED.x_user_id
      ELSE COALESCE(
        EXCLUDED.x_user_id,
        existing.x_user_id
      )
    END,
    last_seen_post_id = CASE
      WHEN LOWER(EXCLUDED.x_username)
        <> LOWER(existing.x_username)
        THEN EXCLUDED.last_seen_post_id
      WHEN EXCLUDED.last_seen_post_id IS NULL
        THEN existing.last_seen_post_id
      WHEN existing.last_seen_post_id IS NULL
        THEN EXCLUDED.last_seen_post_id
      WHEN EXCLUDED.last_seen_post_id::NUMERIC
        > existing.last_seen_post_id::NUMERIC
        THEN EXCLUDED.last_seen_post_id
      ELSE existing.last_seen_post_id
    END,
    last_successful_sync_at = EXCLUDED.last_successful_sync_at;

  WITH stale_posts AS (
    SELECT post_id
    FROM public.councilor_x_posts
    ORDER BY posted_at DESC, post_id DESC
    OFFSET 50
  )
  DELETE FROM public.councilor_x_posts AS post
  USING stale_posts
  WHERE post.post_id = stale_posts.post_id;

  GET DIAGNOSTICS v_pruned_count = ROW_COUNT;
  v_deleted_count := v_deleted_count + v_pruned_count;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.councilor_x_posts),
    v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_councilor_x_post_sync(
  JSONB,
  JSONB,
  JSONB,
  TIMESTAMP WITH TIME ZONE
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.persist_councilor_x_post_sync(
  JSONB,
  JSONB,
  JSONB,
  TIMESTAMP WITH TIME ZONE
) TO service_role;
