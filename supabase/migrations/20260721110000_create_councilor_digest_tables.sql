-- AIインタビュー完了後に、ユーザーが「どの議員へ意見を伝えたいか」を選び、
-- 管理者が週次で議員向けメール本文を作るための管理テーブル。

CREATE TABLE councilor_contacts (
  councilor_id UUID PRIMARY KEY REFERENCES councilors(id) ON DELETE CASCADE,
  email TEXT,
  is_delivery_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_councilor_contacts_updated_at
  BEFORE UPDATE ON councilor_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE councilor_contacts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE councilor_contacts IS '議員向け週次レポート送付に使う管理用連絡先。公開画面には出さない。';
COMMENT ON COLUMN councilor_contacts.councilor_id IS '議員マスタID';
COMMENT ON COLUMN councilor_contacts.email IS '管理者がメール送信時に使う宛先メールアドレス';
COMMENT ON COLUMN councilor_contacts.is_delivery_enabled IS '週次レポート送付対象として扱うかどうか';
COMMENT ON COLUMN councilor_contacts.notes IS '連絡先確認状況などの管理メモ';

CREATE TABLE committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_committees_updated_at
  BEFORE UPDATE ON committees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE committees ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE committees IS '委員会マスタ。案件のstatus_noteから委員会名を推定し、所属議員候補を出す。';
COMMENT ON COLUMN committees.name IS '表示用委員会名';
COMMENT ON COLUMN committees.normalized_name IS '名寄せ用委員会名';
COMMENT ON COLUMN committees.is_active IS '現在の候補推定に使うかどうか';

CREATE TABLE committee_councilors (
  committee_id UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
  councilor_id UUID NOT NULL REFERENCES councilors(id) ON DELETE CASCADE,
  role TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (committee_id, councilor_id)
);

CREATE TRIGGER update_committee_councilors_updated_at
  BEFORE UPDATE ON committee_councilors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE committee_councilors ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE committee_councilors IS '委員会ごとの所属議員。議員宛候補の自動推定に使う。';
COMMENT ON COLUMN committee_councilors.role IS '委員長・副委員長などの任意メモ';
COMMENT ON COLUMN committee_councilors.sort_order IS '候補表示順';

CREATE TABLE interview_report_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_report_id UUID NOT NULL REFERENCES interview_report(id) ON DELETE CASCADE,
  councilor_id UUID NOT NULL REFERENCES councilors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  candidate_source TEXT NOT NULL DEFAULT 'manual',
  share_contact BOOLEAN NOT NULL DEFAULT FALSE,
  contact_name TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT interview_report_recipients_status_check
    CHECK (status IN ('pending', 'included', 'sent')),
  CONSTRAINT interview_report_recipients_candidate_source_check
    CHECK (candidate_source IN ('questioner', 'committee_member', 'statement', 'manual')),
  CONSTRAINT interview_report_recipients_contact_check
    CHECK (
      share_contact = FALSE
      OR (contact_name IS NOT NULL AND contact_email IS NOT NULL)
    ),
  UNIQUE (interview_report_id, councilor_id)
);

CREATE INDEX idx_interview_report_recipients_report
  ON interview_report_recipients(interview_report_id);
CREATE INDEX idx_interview_report_recipients_councilor_status
  ON interview_report_recipients(councilor_id, status, created_at);
CREATE INDEX idx_interview_report_recipients_user
  ON interview_report_recipients(user_id);

CREATE TRIGGER update_interview_report_recipients_updated_at
  BEFORE UPDATE ON interview_report_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE interview_report_recipients ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE interview_report_recipients IS 'AIインタビューレポートをどの議員に伝えたいかというユーザー選択。';
COMMENT ON COLUMN interview_report_recipients.user_id IS '選択したログインユーザーID。所有者確認・監査に使う。';
COMMENT ON COLUMN interview_report_recipients.candidate_source IS '候補に出た理由。questioner/committee_member/statement/manual。';
COMMENT ON COLUMN interview_report_recipients.share_contact IS '議員向け本文にGoogleアカウント情報を含める同意';
COMMENT ON COLUMN interview_report_recipients.contact_name IS '共有同意時のみ保存する表示名';
COMMENT ON COLUMN interview_report_recipients.contact_email IS '共有同意時のみ保存するメールアドレス';
COMMENT ON COLUMN interview_report_recipients.status IS 'pending:未処理 included:本文生成済み sent:管理者が送信済みにした';

CREATE TABLE councilor_digest_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  councilor_id UUID NOT NULL REFERENCES councilors(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  marked_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT councilor_digest_batches_status_check
    CHECK (status IN ('draft', 'sent'))
);

CREATE INDEX idx_councilor_digest_batches_councilor_status
  ON councilor_digest_batches(councilor_id, status, created_at);

CREATE TRIGGER update_councilor_digest_batches_updated_at
  BEFORE UPDATE ON councilor_digest_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE councilor_digest_batches ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE councilor_digest_batches IS '管理者が生成した議員向け週次メール本文のスナップショット。';
COMMENT ON COLUMN councilor_digest_batches.subject IS 'コピーして送るメール件名';
COMMENT ON COLUMN councilor_digest_batches.body IS 'コピーして送るメール本文';
COMMENT ON COLUMN councilor_digest_batches.status IS 'draft:本文生成済み sent:管理者が送信済みにした';

CREATE TABLE councilor_digest_batch_items (
  batch_id UUID NOT NULL REFERENCES councilor_digest_batches(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES interview_report_recipients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (batch_id, recipient_id),
  UNIQUE (recipient_id)
);

ALTER TABLE councilor_digest_batch_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE councilor_digest_batch_items IS '週次メール本文に含めたユーザー選択の対応表。二重送付防止に使う。';

GRANT SELECT, INSERT, UPDATE, DELETE ON councilor_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON councilors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON committees TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON committee_councilors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON interview_report_recipients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON councilor_digest_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON councilor_digest_batch_items TO service_role;
