-- 2026-08-25現在の世田谷区公式名簿へ現行会派・委員会を更新する。
-- 正本:
-- - 会派別議員名簿: https://www.city.setagaya.lg.jp/02030/9511.html
-- - 委員会別議員名簿: https://www.city.setagaya.lg.jp/02030/9510.html

-- おぎのけんじ議員の現行会派。旧会派は過去記事の名寄せ用に残す。
INSERT INTO councilors (
  display_name,
  normalized_name,
  icon_url,
  is_active
)
VALUES (
  '世田谷自民の会',
  '世田谷自民の会',
  NULL,
  TRUE
)
ON CONFLICT (normalized_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  is_active = TRUE,
  updated_at = NOW();

UPDATE councilors
SET
  is_active = FALSE,
  updated_at = NOW()
WHERE normalized_name = '世田谷刷新の会'
  AND icon_url IS NULL;

-- 委員構成は2026-07-21投入分から変更なし。現行10委員会を明示的に有効化し、
-- 過去の委員会レコードと所属関係は履歴・名寄せ用に保持する。
WITH official_committees(normalized_name) AS (
  VALUES
    ('企画総務常任委員会'),
    ('区民生活常任委員会'),
    ('福祉保健常任委員会'),
    ('都市整備常任委員会'),
    ('文教常任委員会'),
    ('議会運営委員会'),
    ('DX・地域行政・公共施設整備等推進特別委員会'),
    ('災害・防犯・オウム問題対策等特別委員会'),
    ('子ども・若者施策推進特別委員会'),
    ('環境・清掃・リサイクル対策等特別委員会')
)
UPDATE committees
SET
  is_active = committees.normalized_name IN (
    SELECT normalized_name FROM official_committees
  ),
  updated_at = NOW();
