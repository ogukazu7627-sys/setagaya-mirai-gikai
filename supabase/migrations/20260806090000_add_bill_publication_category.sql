DO $$
BEGIN
  CREATE TYPE bill_publication_category AS ENUM (
    'report',
    'general_question',
    'budget'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE bills
ADD COLUMN IF NOT EXISTS publication_category bill_publication_category
  NOT NULL DEFAULT 'report';

CREATE INDEX IF NOT EXISTS idx_bills_publication_category
ON bills(publication_category);

COMMENT ON TYPE bill_publication_category IS
  'Published content category for Setagaya admin operations';

COMMENT ON COLUMN bills.publication_category IS
  'Publication category used when publish_status is published: report, general_question, or budget. Existing records default to report.';
