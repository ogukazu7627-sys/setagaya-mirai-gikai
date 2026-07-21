-- 20260708223000_create_councilor_statements.sql は本番DBで適用済みのため、
-- 会派マスタの追加分を既存DBにも反映する。

INSERT INTO councilors (display_name, normalized_name, icon_url) VALUES
  ('自由民主党世田谷区議団', '自由民主党世田谷区議団', NULL),
  ('公明党世田谷区議団', '公明党世田谷区議団', NULL),
  ('立憲民主党・無所属世田谷区議団', '立憲民主党・無所属世田谷区議団', NULL),
  ('改革無所属の会', '改革無所属の会', NULL),
  ('日本共産党世田谷区議団', '日本共産党世田谷区議団', NULL),
  ('国民民主党・都民ファーストの会', '国民民主党・都民ファーストの会', NULL),
  ('生活者ネットワーク世田谷区議団', '生活者ネットワーク世田谷区議団', NULL),
  ('レインボー世田谷', 'レインボー世田谷', NULL),
  ('せたがやの風', 'せたがやの風', NULL),
  ('世田谷刷新の会', '世田谷刷新の会', NULL),
  ('世田谷無所属', '世田谷無所属', NULL),
  ('国際都市せたがや', '国際都市せたがや', NULL),
  ('日本維新の会', '日本維新の会', NULL),
  ('参政党', '参政党', NULL),
  ('世田谷から日本を愛する会', '世田谷から日本を愛する会', NULL),
  ('無所属', '無所属', NULL)
ON CONFLICT (normalized_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon_url = EXCLUDED.icon_url,
  is_active = TRUE,
  updated_at = NOW();

COMMENT ON TABLE councilors IS '世田谷区議会議員・会派のマスタ。議員発言抽出時の名寄せに使う。';
COMMENT ON COLUMN councilors.display_name IS '表示用の議員名・会派名';
COMMENT ON COLUMN councilors.normalized_name IS '名寄せ用に正規化した議員名・会派名';
COMMENT ON COLUMN councilors.icon_url IS '公開画面の議員アイコンURL。会派はNULL';
COMMENT ON COLUMN councilors.is_active IS '現在の議員または会派として扱うかどうか';
COMMENT ON COLUMN councilor_bill_statements.councilor_id IS '議員・会派マスタに一致した場合のID。未登録名はNULL';
COMMENT ON COLUMN councilor_bill_statements.councilor_name IS 'Markdown見出しから正規化した議員名・会派名';
