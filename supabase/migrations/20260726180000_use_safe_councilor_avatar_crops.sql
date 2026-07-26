-- 丸いアバター内で頭頂や顎が切れないよう、余白付き正方形画像へ切り替える。
WITH avatar_updates(normalized_name, icon_url) AS (
  VALUES
    ('阿久津皇', '/icons/councilors/akutsu-hikaru-avatar.jpg'),
    ('石川ナオミ', '/icons/councilors/ishikawa-naomi-avatar.jpg'),
    ('石原せいじ', '/icons/councilors/ishihara-seiji-avatar.jpg'),
    ('いたいひとし', '/icons/councilors/itai-hitoshi-avatar.jpg'),
    ('岡川大記', '/icons/councilors/okagawa-daiki-avatar.jpg'),
    ('おぎのけんじ', '/icons/councilors/ogino-kenji-avatar.png'),
    ('おのみずき', '/icons/councilors/ono-mizuki-avatar.jpg'),
    ('オルズグル', '/icons/councilors/oruzuguru-avatar.jpg'),
    ('加藤たいき', '/icons/councilors/kato-taiki-avatar.jpg'),
    ('神尾りさ', '/icons/councilors/kamio-risa-avatar.jpg'),
    ('川上こういち', '/icons/councilors/kawakami-koichi-avatar.png'),
    ('河村みどり', '/icons/councilors/kawamura-midori-avatar.jpg'),
    ('河野俊弘', '/icons/councilors/kono-toshihiro-avatar.jpg'),
    ('坂口賢一', '/icons/councilors/sakaguchi-kenichi-avatar.jpg'),
    ('坂本みえこ', '/icons/councilors/sakamoto-mieko-avatar.jpg'),
    ('佐藤ひろと', '/icons/councilors/sato-hiroto-avatar.png'),
    ('佐藤正幸', '/icons/councilors/sato-masayuki-avatar.jpg'),
    ('宍戸三郎', '/icons/councilors/shishido-saburo-avatar.jpg'),
    ('関口江利子', '/icons/councilors/sekiguchi-eriko-avatar.jpg'),
    ('そのべせいや', '/icons/councilors/sonobe-seiya-avatar.png'),
    ('たかじょう訓子', '/icons/councilors/takajo-noriko-avatar.jpg'),
    ('高橋昭彦', '/icons/councilors/takahashi-akihiko-avatar.jpg'),
    ('田中優子', '/icons/councilors/tanaka-yuko-avatar.png'),
    ('津上仁志', '/icons/councilors/tsugami-hitoshi-avatar.jpg'),
    ('中里光夫', '/icons/councilors/nakazato-mitsuo-avatar.jpg'),
    ('原田竜馬', '/icons/councilors/harada-ryoma-avatar.jpg'),
    ('ひえしま進', '/icons/councilors/hieshima-susumu-avatar.jpg'),
    ('平塚けいじ', '/icons/councilors/hiratsuka-keiji-avatar.jpg'),
    ('福田たえ美', '/icons/councilors/fukuda-taemi-avatar.jpg'),
    ('藤井まな', '/icons/councilors/fujii-mana-avatar.jpg'),
    ('桃野芳文', '/icons/councilors/momono-yoshifumi-avatar.jpg'),
    ('山口ひろひさ', '/icons/councilors/yamaguchi-hirohisa-avatar.jpg'),
    ('和田ひでとし', '/icons/councilors/wada-hidetoshi-avatar.jpg'),
    ('青空こうじ', '/icons/councilors/aozora-koji-avatar.jpg')
)
UPDATE councilors
SET icon_url = avatar_updates.icon_url
FROM avatar_updates
WHERE councilors.normalized_name = avatar_updates.normalized_name;
