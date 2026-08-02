ALTER TYPE bill_publish_status ADD VALUE IF NOT EXISTS 'published_non_bill';

COMMENT ON TYPE bill_publish_status IS
  'ENUM type for bill publication status, including public non-bill source records';
