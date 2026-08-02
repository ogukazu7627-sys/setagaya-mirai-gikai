DROP INDEX IF EXISTS idx_bills_publish_status_order;

ALTER TABLE bills DROP COLUMN IF EXISTS publish_status_order;

ALTER TABLE bills
ADD COLUMN publish_status_order INT GENERATED ALWAYS AS (
  CASE publish_status
    WHEN 'draft'              THEN 0
    WHEN 'coming_soon'        THEN 1
    WHEN 'published'          THEN 2
    WHEN 'published_non_bill' THEN 3
    ELSE 99
  END
) STORED;

CREATE INDEX idx_bills_publish_status_order ON bills(publish_status_order);

COMMENT ON COLUMN bills.publish_status IS
  'Publication status: draft (private), published (public bill), coming_soon (teaser), or published_non_bill (public source excluded from bill pages)';
