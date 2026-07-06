CREATE TYPE bill_item_type AS ENUM ('bill', 'report', 'petition', 'question');

ALTER TABLE bills
  ADD COLUMN item_type bill_item_type NOT NULL DEFAULT 'bill';

CREATE INDEX idx_bills_item_type ON bills(item_type);

COMMENT ON TYPE bill_item_type IS 'Setagaya item type: bill, report, petition, question';
COMMENT ON COLUMN bills.item_type IS '案件タイプ（bill: 議案, report: 報告事項, petition: 請願・陳情, question: 質問）';
