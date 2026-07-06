ALTER TABLE bills
  ADD COLUMN status_label text;

COMMENT ON COLUMN bills.status_label IS '画面表示用の案件ステータスラベル（例: 可決、委員会で報告、文教常任委員会に付託、本会議で質問・答弁済み）';
