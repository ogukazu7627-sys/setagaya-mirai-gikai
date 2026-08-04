UPDATE bills
SET
  publish_status = 'draft',
  published_at = NULL,
  updated_at = NOW()
WHERE publish_status::TEXT = 'published_non_bill';

DROP INDEX IF EXISTS idx_bills_publish_status_order;

ALTER TABLE bills DROP COLUMN IF EXISTS publish_status_order;

ALTER TABLE bills
ALTER COLUMN publish_status DROP DEFAULT;

CREATE TYPE bill_publish_status_without_non_bill AS ENUM (
  'draft',
  'published',
  'coming_soon'
);

ALTER TABLE bills
ALTER COLUMN publish_status TYPE bill_publish_status_without_non_bill
USING publish_status::TEXT::bill_publish_status_without_non_bill;

DROP TYPE bill_publish_status;

ALTER TYPE bill_publish_status_without_non_bill RENAME TO bill_publish_status;

ALTER TABLE bills
ALTER COLUMN publish_status SET DEFAULT 'draft'::bill_publish_status;

ALTER TABLE bills
ADD COLUMN publish_status_order INT GENERATED ALWAYS AS (
  CASE publish_status
    WHEN 'draft'       THEN 0
    WHEN 'coming_soon' THEN 1
    WHEN 'published'   THEN 2
  END
) STORED;

CREATE INDEX idx_bills_publish_status_order ON bills(publish_status_order);

COMMENT ON TYPE bill_publish_status IS
  'ENUM type for bill publication status';

COMMENT ON COLUMN bills.publish_status IS
  'Publication status: draft (private), published (public), or coming_soon (teaser)';
