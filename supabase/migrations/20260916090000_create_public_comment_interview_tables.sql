-- パブリックコメント作成用のAIインタビュー基盤。
-- 既存の bills / interview_* は案件ページの機能として維持し、ここでは利用しない。

CREATE TABLE public.public_comment_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  submission_deadline TIMESTAMPTZ NOT NULL,
  official_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.public_comment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.public_comment_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  publication_status TEXT NOT NULL DEFAULT 'private'
    CHECK (publication_status IN ('private', 'pending_review', 'published', 'rejected', 'unpublished')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.public_comment_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.public_comment_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
  stage TEXT NOT NULL CHECK (stage IN ('interview', 'draft')),
  question_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.public_comment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.public_comment_sessions(id) ON DELETE CASCADE,
  target_ordinances TEXT[] NOT NULL DEFAULT '{}',
  ai_body TEXT NOT NULL,
  final_body TEXT NOT NULL,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  fact_check_notes TEXT[] NOT NULL DEFAULT '{}',
  publication_requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX public_comment_active_session_idx
  ON public.public_comment_sessions (campaign_id, user_id)
  WHERE completed_at IS NULL;

CREATE INDEX public_comment_messages_session_idx
  ON public.public_comment_messages (session_id, created_at);

CREATE INDEX public_comment_sessions_publication_status_idx
  ON public.public_comment_sessions (publication_status, created_at);

CREATE TRIGGER update_public_comment_campaigns_updated_at
  BEFORE UPDATE ON public.public_comment_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_comment_sessions_updated_at
  BEFORE UPDATE ON public.public_comment_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_comment_drafts_updated_at
  BEFORE UPDATE ON public.public_comment_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.public_comment_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_comment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_comment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_comment_drafts ENABLE ROW LEVEL SECURITY;

-- 個人の発言と下書きは、Web/Adminのサーバー側Service Roleだけが扱う。
-- 公開一覧も承認済みの本文だけをサーバー側ローダーから返す。

INSERT INTO public.public_comment_campaigns (
  slug,
  title,
  submission_deadline,
  official_url,
  status
)
VALUES (
  'minpaku-2026',
  '民泊・旅館業の条例改正素案へのパブリックコメント',
  '2026-10-06 23:59:59+09',
  'https://www.city.setagaya.lg.jp/02245/35467.html',
  'published'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  submission_deadline = EXCLUDED.submission_deadline,
  official_url = EXCLUDED.official_url,
  status = EXCLUDED.status,
  updated_at = NOW();
