-- 議員マスタに、本人が公開しているXプロフィールURLを保持する。

ALTER TABLE councilors
  ADD COLUMN x_account_url TEXT;

COMMENT ON COLUMN councilors.x_account_url IS
  '議員本人の公開XプロフィールURL。確認できない場合はNULL';

WITH x_accounts(normalized_name, x_account_url) AS (
  VALUES
    ('阿久津皇', 'https://x.com/ko_akutsu'),
    ('石川ナオミ', 'https://x.com/naonao773703'),
    ('石原せいじ', 'https://x.com/ishiharaseiji21'),
    ('いたいひとし', 'https://x.com/itai0830'),
    ('岡川大記', 'https://x.com/okagawa_taiki'),
    ('岡本のぶ子', 'https://x.com/nobuko20160913'),
    ('おぎのけんじ', 'https://x.com/ogino_kenji'),
    ('おのみずき', 'https://x.com/mizuki_ono_1001'),
    ('オルズグル', 'https://x.com/orzugulsetagaya'),
    ('加藤たいき', 'https://x.com/kato_taiki'),
    ('神尾りさ', 'https://x.com/RisaKamio'),
    ('上川あや', 'https://x.com/KamikawaAya'),
    ('川上こういち', 'https://x.com/kawakami1974'),
    ('河村みどり', 'https://x.com/midori_kawamura'),
    ('くろだあいこ', 'https://x.com/Kuroda_Aiko'),
    ('河野俊弘', 'https://x.com/kouno_toshihiro'),
    ('坂口賢一', 'https://x.com/sakaguchi_1010'),
    ('坂本みえこ', 'https://x.com/jcpsakamotomimi'),
    ('桜井純子', 'https://x.com/sakuraijunko'),
    ('佐藤ひろと', 'https://x.com/hiroto_satoh'),
    ('佐藤正幸', 'https://x.com/MSatohforPR'),
    ('佐藤美樹', 'https://x.com/miki_setagaya'),
    ('宍戸三郎', 'https://x.com/shishidosaburo'),
    ('関口江利子', 'https://x.com/OuuQy6b5lEG1j8L'),
    ('そのべせいや', 'https://x.com/sonobe_tokyo'),
    ('たかじょう訓子', 'https://x.com/kunkun55'),
    ('高橋昭彦', 'https://x.com/akihiko_taka'),
    ('田中優子', 'https://x.com/setagaya_tanaka'),
    ('津上仁志', 'https://x.com/tsugami_hitoshi'),
    ('つるみけんご', 'https://x.com/tsurumikengo'),
    ('中里光夫', 'https://x.com/nakazato_mitsuo'),
    ('中塚さちよ', 'https://x.com/nakatsukahelper'),
    ('中山みずほ', 'https://x.com/nakayamamizuho'),
    ('畠山晋一', 'https://x.com/ShinHatake1008'),
    ('羽田圭二', 'https://x.com/keijihaneda'),
    ('原田竜馬', 'https://x.com/Harada_Ryoma'),
    ('ひうち優子', 'https://x.com/hiuchiyuko'),
    ('ひえしま進', 'https://x.com/hieshima_susumu'),
    ('平塚けいじ', 'https://x.com/hiratsuka_k'),
    ('福田たえ美', 'https://x.com/fukuda_taemi'),
    ('藤井まな', 'https://x.com/mana_setagaya'),
    ('みやかおり', 'https://x.com/kaorinka04'),
    ('桃野芳文', 'https://x.com/momono4423'),
    ('山口ひろひさ', 'https://x.com/goo1211jp'),
    ('若林りさ', 'https://x.com/lisagayaku')
)
UPDATE councilors
SET x_account_url = x_accounts.x_account_url
FROM x_accounts
WHERE councilors.normalized_name = x_accounts.normalized_name;
