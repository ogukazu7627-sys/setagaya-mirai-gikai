-- Treat submitted_date as a calendar date, not a timestamp.
-- Existing values such as 2026-05-27T15:00:00Z represent 2026-05-28
-- in Japan time, so preserve the Japan calendar date during conversion.

DROP TRIGGER IF EXISTS trigger_sync_bills_published_submitted ON bills;
DROP FUNCTION IF EXISTS sync_bills_published_submitted();

DROP INDEX IF EXISTS idx_bills_submitted_date;

ALTER TABLE bills
  ALTER COLUMN submitted_date TYPE DATE
  USING CASE
    WHEN submitted_date IS NULL THEN NULL
    ELSE (submitted_date AT TIME ZONE 'Asia/Tokyo')::date
  END;

CREATE INDEX idx_bills_submitted_date ON bills(submitted_date DESC);

COMMENT ON COLUMN bills.submitted_date IS
  '案件の代表日。質問日、提出日、報告日などをYYYY-MM-DDの日付として保持する。';
