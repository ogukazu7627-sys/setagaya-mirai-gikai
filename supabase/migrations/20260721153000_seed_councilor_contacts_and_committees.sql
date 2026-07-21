-- 世田谷区公式ページをもとに、議員向け週次レポート用の連絡先と委員会名簿を初期投入する。
-- 出典:
-- - 区議会議員紹介: https://www.city.setagaya.lg.jp/02030/9461.html
-- - 委員会別議員名簿: https://www.city.setagaya.lg.jp/02030/9510.html

WITH source_contacts(normalized_name, email) AS (
  VALUES
    ('阿久津皇', 'ko@akutsu.net'),
    ('石川ナオミ', 'info@naomi-ishikawa.com'),
    ('石原せいじ', 'seiji@goriseiji.com'),
    ('いたいひとし', 'h-itai@fsinet.or.jp'),
    ('大庭正明', '110ban@t3.rim.or.jp'),
    ('岡川大記', 'taiki_okagawa@yahoo.co.jp'),
    ('岡本のぶ子', 'nobuko_okamoto@s3.dion.ne.jp'),
    ('おぎのけんじ', 'ogino@oginokenji.jp'),
    ('おのみずき', 'setagaya@seikatsusha.net'),
    ('オルズグル', 'orzugulsetagaya@gmail.com'),
    ('加藤たいき', 'katotaiki12@gmail.com'),
    ('神尾りさ', 'info@kamiorisa.tokyo'),
    ('上川あや', 'mail@ah-yeah.com'),
    ('川上こういち', 'kawakami@jcp-setagaya.jp'),
    ('河村みどり', 'midori.setagaya@gmail.com'),
    ('くろだあいこ', 'kuroda.aiko65@gmail.com'),
    ('河野俊弘', 'info@kouno.tokyo'),
    ('坂口賢一', 'k-sakaguchi@fujiya-bakery.co.jp'),
    ('坂本みえこ', 'sakamoto@jcp-setagaya.jp'),
    ('桜井純子', 'sakurai.sdp@gmail.com'),
    ('佐藤ひろと', 'oyakuni@sato-hiroto.com'),
    ('佐藤正幸', 'masasatoh.pr@gmail.com'),
    ('佐藤美樹', 'miki@4joylife.com'),
    ('宍戸三郎', 'shishido4410@cello.ocn.ne.jp'),
    ('下山芳男', 'shimoyoshi4774@gmail.com'),
    ('関口江利子', 'setagaya@seikatsusha.net'),
    ('そのべせいや', 'info@sonobe.tokyo'),
    ('たかじょう訓子', 'takajokuniko@gmail.com'),
    ('高橋昭彦', 'yrw03721@nifty.ne.jp'),
    ('田中優子', 'setagaya@tanakayuko.net'),
    ('津上仁志', 'hitoshi@tsugami.net'),
    ('つるみけんご', 'kengo@k-tsurumi.net'),
    ('中里光夫', 'nakazato@jcp-setagaya.jp'),
    ('中塚さちよ', 'nakatsukasachiyo@gmail.com'),
    ('中山みずほ', 'info@nakayamamizuho.net'),
    ('畠山晋一', '39shin1008@gmail.com'),
    ('羽田圭二', 'haneda@myad.jp'),
    ('原田竜馬', 'contact@haradaryoma.com'),
    ('ひうち優子', 'kinako1212000@yahoo.co.jp'),
    ('ひえしま進', 'hieshima.susumu.gikai@gmail.com'),
    ('平塚けいじ', 'keiji@hiratsuka-net.com'),
    ('福田たえ美', 'taemi@sunny.ocn.ne.jp'),
    ('藤井まな', 'mana@mana-f.com'),
    ('みやかおり', 'miyakaorisetagaya@gmail.com'),
    ('桃野芳文', 'setagaya@momono-yoshifumi.net'),
    ('山口ひろひさ', 'hiro1211@dh.mbn.or.jp'),
    ('若林りさ', 'lisagayaku@gmail.com'),
    ('和田ひでとし', 'info@wadahidetoshi.com')
),
matched_contacts AS (
  SELECT c.id AS councilor_id, source_contacts.email
  FROM source_contacts
  JOIN councilors c
    ON c.normalized_name = source_contacts.normalized_name
  WHERE c.icon_url IS NOT NULL
)
INSERT INTO councilor_contacts (
  councilor_id,
  email,
  is_delivery_enabled,
  notes
)
SELECT
  councilor_id,
  email,
  TRUE,
  '世田谷区公式ホームページ「区議会議員紹介」（2026-06-15更新）をもとに初期登録'
FROM matched_contacts
ON CONFLICT (councilor_id) DO UPDATE SET
  email = EXCLUDED.email,
  is_delivery_enabled = EXCLUDED.is_delivery_enabled,
  notes = EXCLUDED.notes,
  updated_at = NOW();

WITH source_committees(name, normalized_name) AS (
  VALUES
    ('企画総務常任委員会', '企画総務常任委員会'),
    ('区民生活常任委員会', '区民生活常任委員会'),
    ('福祉保健常任委員会', '福祉保健常任委員会'),
    ('都市整備常任委員会', '都市整備常任委員会'),
    ('文教常任委員会', '文教常任委員会'),
    ('議会運営委員会', '議会運営委員会'),
    ('DX・地域行政・公共施設整備等推進特別委員会', 'DX・地域行政・公共施設整備等推進特別委員会'),
    ('災害・防犯・オウム問題対策等特別委員会', '災害・防犯・オウム問題対策等特別委員会'),
    ('子ども・若者施策推進特別委員会', '子ども・若者施策推進特別委員会'),
    ('環境・清掃・リサイクル対策等特別委員会', '環境・清掃・リサイクル対策等特別委員会')
)
INSERT INTO committees (name, normalized_name, is_active)
SELECT name, normalized_name, TRUE
FROM source_committees
ON CONFLICT (normalized_name) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = TRUE,
  updated_at = NOW();

WITH source_committees(normalized_name) AS (
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
DELETE FROM committee_councilors
WHERE committee_id IN (
  SELECT committees.id
  FROM committees
  JOIN source_committees
    ON source_committees.normalized_name = committees.normalized_name
);

WITH source_members(committee_normalized_name, councilor_normalized_name, role, sort_order) AS (
  VALUES
    ('企画総務常任委員会', '加藤たいき', '委員長', 1),
    ('企画総務常任委員会', '津上仁志', '副委員長', 2),
    ('企画総務常任委員会', 'くろだあいこ', '委員', 3),
    ('企画総務常任委員会', '真鍋よしゆき', '委員', 4),
    ('企画総務常任委員会', '羽田圭二', '委員', 5),
    ('企画総務常任委員会', '大庭正明', '委員', 6),
    ('企画総務常任委員会', '坂本みえこ', '委員', 7),
    ('企画総務常任委員会', 'そのべせいや', '委員', 8),
    ('企画総務常任委員会', '神尾りさ', '委員', 9),
    ('企画総務常任委員会', '青空こうじ', '委員', 10),
    ('区民生活常任委員会', '平塚けいじ', '委員長', 1),
    ('区民生活常任委員会', '桃野芳文', '副委員長', 2),
    ('区民生活常任委員会', '河野俊弘', '委員', 3),
    ('区民生活常任委員会', '和田ひでとし', '委員', 4),
    ('区民生活常任委員会', '河村みどり', '委員', 5),
    ('区民生活常任委員会', '原田竜馬', '委員', 6),
    ('区民生活常任委員会', 'みやかおり', '委員', 7),
    ('区民生活常任委員会', '中里光夫', '委員', 8),
    ('区民生活常任委員会', '石原せいじ', '委員', 9),
    ('区民生活常任委員会', 'つるみけんご', '委員', 10),
    ('福祉保健常任委員会', 'いたいひとし', '委員長', 1),
    ('福祉保健常任委員会', '阿久津皇', '副委員長', 2),
    ('福祉保健常任委員会', '石川ナオミ', '委員', 3),
    ('福祉保健常任委員会', '佐藤正幸', '委員', 4),
    ('福祉保健常任委員会', '福田たえ美', '委員', 5),
    ('福祉保健常任委員会', '藤井まな', '委員', 6),
    ('福祉保健常任委員会', '田中優子', '委員', 7),
    ('福祉保健常任委員会', '川上こういち', '委員', 8),
    ('福祉保健常任委員会', 'おのみずき', '委員', 9),
    ('福祉保健常任委員会', 'オルズグル', '委員', 10),
    ('都市整備常任委員会', '畠山晋一', '委員長', 1),
    ('都市整備常任委員会', 'たかじょう訓子', '副委員長', 2),
    ('都市整備常任委員会', '下山芳男', '委員', 3),
    ('都市整備常任委員会', '山口ひろひさ', '委員', 4),
    ('都市整備常任委員会', '佐藤ひろと', '委員', 5),
    ('都市整備常任委員会', '中塚さちよ', '委員', 6),
    ('都市整備常任委員会', '関口江利子', '委員', 7),
    ('都市整備常任委員会', 'ひうち優子', '委員', 8),
    ('都市整備常任委員会', '岡川大記', '委員', 9),
    ('都市整備常任委員会', '若林りさ', '委員', 10),
    ('文教常任委員会', '桜井純子', '委員長', 1),
    ('文教常任委員会', '坂口賢一', '副委員長', 2),
    ('文教常任委員会', '宍戸三郎', '委員', 3),
    ('文教常任委員会', '岡本のぶ子', '委員', 4),
    ('文教常任委員会', '高橋昭彦', '委員', 5),
    ('文教常任委員会', '中山みずほ', '委員', 6),
    ('文教常任委員会', 'ひえしま進', '委員', 7),
    ('文教常任委員会', '佐藤美樹', '委員', 8),
    ('文教常任委員会', '上川あや', '委員', 9),
    ('文教常任委員会', 'おぎのけんじ', '委員', 10),
    ('議会運営委員会', '下山芳男', '委員長', 1),
    ('議会運営委員会', '佐藤ひろと', '副委員長', 2),
    ('議会運営委員会', '加藤たいき', '委員', 3),
    ('議会運営委員会', '河野俊弘', '委員', 4),
    ('議会運営委員会', '宍戸三郎', '委員', 5),
    ('議会運営委員会', '畠山晋一', '委員', 6),
    ('議会運営委員会', '岡本のぶ子', '委員', 7),
    ('議会運営委員会', '津上仁志', '委員', 8),
    ('議会運営委員会', '羽田圭二', '委員', 9),
    ('議会運営委員会', '原田竜馬', '委員', 10),
    ('議会運営委員会', '藤井まな', '委員', 11),
    ('議会運営委員会', 'ひえしま進', '委員', 12),
    ('議会運営委員会', '桃野芳文', '委員', 13),
    ('議会運営委員会', '川上こういち', '委員', 14),
    ('議会運営委員会', '坂本みえこ', '委員', 15),
    ('DX・地域行政・公共施設整備等推進特別委員会', '山口ひろひさ', '委員長', 1),
    ('DX・地域行政・公共施設整備等推進特別委員会', '佐藤ひろと', '副委員長', 2),
    ('DX・地域行政・公共施設整備等推進特別委員会', '加藤たいき', '委員', 3),
    ('DX・地域行政・公共施設整備等推進特別委員会', '畠山晋一', '委員', 4),
    ('DX・地域行政・公共施設整備等推進特別委員会', '真鍋よしゆき', '委員', 5),
    ('DX・地域行政・公共施設整備等推進特別委員会', '福田たえ美', '委員', 6),
    ('DX・地域行政・公共施設整備等推進特別委員会', '中塚さちよ', '委員', 7),
    ('DX・地域行政・公共施設整備等推進特別委員会', '羽田圭二', '委員', 8),
    ('DX・地域行政・公共施設整備等推進特別委員会', '大庭正明', '委員', 9),
    ('DX・地域行政・公共施設整備等推進特別委員会', '中里光夫', '委員', 10),
    ('DX・地域行政・公共施設整備等推進特別委員会', '佐藤美樹', '委員', 11),
    ('DX・地域行政・公共施設整備等推進特別委員会', 'つるみけんご', '委員', 12),
    ('DX・地域行政・公共施設整備等推進特別委員会', '岡川大記', '委員', 13),
    ('災害・防犯・オウム問題対策等特別委員会', 'ひえしま進', '委員長', 1),
    ('災害・防犯・オウム問題対策等特別委員会', '宍戸三郎', '副委員長', 2),
    ('災害・防犯・オウム問題対策等特別委員会', 'くろだあいこ', '委員', 3),
    ('災害・防犯・オウム問題対策等特別委員会', '和田ひでとし', '委員', 4),
    ('災害・防犯・オウム問題対策等特別委員会', 'いたいひとし', '委員', 5),
    ('災害・防犯・オウム問題対策等特別委員会', '河村みどり', '委員', 6),
    ('災害・防犯・オウム問題対策等特別委員会', '藤井まな', '委員', 7),
    ('災害・防犯・オウム問題対策等特別委員会', 'みやかおり', '委員', 8),
    ('災害・防犯・オウム問題対策等特別委員会', '川上こういち', '委員', 9),
    ('災害・防犯・オウム問題対策等特別委員会', '石原せいじ', '委員', 10),
    ('災害・防犯・オウム問題対策等特別委員会', '上川あや', '委員', 11),
    ('災害・防犯・オウム問題対策等特別委員会', '若林りさ', '委員', 12),
    ('子ども・若者施策推進特別委員会', '河野俊弘', '委員長', 1),
    ('子ども・若者施策推進特別委員会', '中山みずほ', '副委員長', 2),
    ('子ども・若者施策推進特別委員会', '阿久津皇', '委員', 3),
    ('子ども・若者施策推進特別委員会', '坂口賢一', '委員', 4),
    ('子ども・若者施策推進特別委員会', '岡本のぶ子', '委員', 5),
    ('子ども・若者施策推進特別委員会', '津上仁志', '委員', 6),
    ('子ども・若者施策推進特別委員会', '原田竜馬', '委員', 7),
    ('子ども・若者施策推進特別委員会', '田中優子', '委員', 8),
    ('子ども・若者施策推進特別委員会', 'たかじょう訓子', '委員', 9),
    ('子ども・若者施策推進特別委員会', 'そのべせいや', '委員', 10),
    ('子ども・若者施策推進特別委員会', 'おのみずき', '委員', 11),
    ('子ども・若者施策推進特別委員会', 'おぎのけんじ', '委員', 12),
    ('子ども・若者施策推進特別委員会', '神尾りさ', '委員', 13),
    ('環境・清掃・リサイクル対策等特別委員会', '坂本みえこ', '委員長', 1),
    ('環境・清掃・リサイクル対策等特別委員会', '佐藤正幸', '副委員長', 2),
    ('環境・清掃・リサイクル対策等特別委員会', '石川ナオミ', '委員', 3),
    ('環境・清掃・リサイクル対策等特別委員会', '下山芳男', '委員', 4),
    ('環境・清掃・リサイクル対策等特別委員会', '高橋昭彦', '委員', 5),
    ('環境・清掃・リサイクル対策等特別委員会', '平塚けいじ', '委員', 6),
    ('環境・清掃・リサイクル対策等特別委員会', '桜井純子', '委員', 7),
    ('環境・清掃・リサイクル対策等特別委員会', '桃野芳文', '委員', 8),
    ('環境・清掃・リサイクル対策等特別委員会', '関口江利子', '委員', 9),
    ('環境・清掃・リサイクル対策等特別委員会', 'ひうち優子', '委員', 10),
    ('環境・清掃・リサイクル対策等特別委員会', 'オルズグル', '委員', 11),
    ('環境・清掃・リサイクル対策等特別委員会', '青空こうじ', '委員', 12)
)
INSERT INTO committee_councilors (
  committee_id,
  councilor_id,
  role,
  sort_order
)
SELECT
  committees.id,
  councilors.id,
  source_members.role,
  source_members.sort_order
FROM source_members
JOIN committees
  ON committees.normalized_name = source_members.committee_normalized_name
JOIN councilors
  ON councilors.normalized_name = source_members.councilor_normalized_name
WHERE councilors.icon_url IS NOT NULL
ON CONFLICT (committee_id, councilor_id) DO UPDATE SET
  role = EXCLUDED.role,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();
