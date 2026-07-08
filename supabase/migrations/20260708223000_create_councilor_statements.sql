-- 議員の意見セクションから抽出した発言を正規化して保持する。
-- Markdown本文（bill_contents.content）が正本で、本テーブルは集計用の読み取りモデル。

CREATE TABLE councilors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_councilors_updated_at BEFORE UPDATE ON councilors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE councilors ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE councilors IS '世田谷区議会議員のマスタ。議員発言抽出時の名寄せに使う。';
COMMENT ON COLUMN councilors.display_name IS '表示用の議員名';
COMMENT ON COLUMN councilors.normalized_name IS '名寄せ用に正規化した議員名';
COMMENT ON COLUMN councilors.icon_url IS '公開画面の議員アイコンURL';
COMMENT ON COLUMN councilors.is_active IS '現在の議員として扱うかどうか';

INSERT INTO councilors (display_name, normalized_name, icon_url) VALUES
  ('阿久津皇', '阿久津皇', '/icons/councilors/akutsu-hikaru.jpg'),
  ('石川ナオミ', '石川ナオミ', '/icons/councilors/ishikawa-naomi.jpg'),
  ('石原せいじ', '石原せいじ', '/icons/councilors/ishihara-seiji.jpg'),
  ('いたいひとし', 'いたいひとし', '/icons/councilors/itai-hitoshi.jpg'),
  ('大庭正明', '大庭正明', '/icons/councilors/oba-masaaki.jpg'),
  ('岡川大記', '岡川大記', '/icons/councilors/okagawa-daiki.jpg'),
  ('岡本のぶ子', '岡本のぶ子', '/icons/councilors/okamoto-nobuko.jpg'),
  ('おぎのけんじ', 'おぎのけんじ', '/icons/councilors/ogino-kenji.png'),
  ('おのみずき', 'おのみずき', '/icons/councilors/ono-mizuki.jpg'),
  ('オルズグル', 'オルズグル', '/icons/councilors/oruzuguru.jpg'),
  ('加藤たいき', '加藤たいき', '/icons/councilors/kato-taiki.jpg'),
  ('神尾りさ', '神尾りさ', '/icons/councilors/kamio-risa.jpg'),
  ('上川あや', '上川あや', '/icons/councilors/kamikawa-aya.jpg'),
  ('川上こういち', '川上こういち', '/icons/councilors/kawakami-koichi.png'),
  ('河村みどり', '河村みどり', '/icons/councilors/kawamura-midori.jpg'),
  ('くろだあいこ', 'くろだあいこ', '/icons/councilors/kuroda-aiko.jpg'),
  ('河野俊弘', '河野俊弘', '/icons/councilors/kono-toshihiro.jpg'),
  ('坂口賢一', '坂口賢一', '/icons/councilors/sakaguchi-kenichi.jpg'),
  ('坂本みえこ', '坂本みえこ', '/icons/councilors/sakamoto-mieko.jpg'),
  ('桜井純子', '桜井純子', '/icons/councilors/sakurai-junko.jpg'),
  ('佐藤ひろと', '佐藤ひろと', '/icons/councilors/sato-hiroto.png'),
  ('佐藤正幸', '佐藤正幸', '/icons/councilors/sato-masayuki.jpg'),
  ('佐藤美樹', '佐藤美樹', '/icons/councilors/sato-miki.jpg'),
  ('宍戸三郎', '宍戸三郎', '/icons/councilors/shishido-saburo.jpg'),
  ('下山芳男', '下山芳男', '/icons/councilors/shimoyama-yoshio.jpg'),
  ('関口江利子', '関口江利子', '/icons/councilors/sekiguchi-eriko.jpg'),
  ('そのべせいや', 'そのべせいや', '/icons/councilors/sonobe-seiya.png'),
  ('たかじょう訓子', 'たかじょう訓子', '/icons/councilors/takajo-noriko.jpg'),
  ('高橋昭彦', '高橋昭彦', '/icons/councilors/takahashi-akihiko.jpg'),
  ('田中優子', '田中優子', '/icons/councilors/tanaka-yuko.png'),
  ('津上仁志', '津上仁志', '/icons/councilors/tsugami-hitoshi.jpg'),
  ('つるみけんご', 'つるみけんご', '/icons/councilors/tsurumi-kengo.jpg'),
  ('中里光夫', '中里光夫', '/icons/councilors/nakazato-mitsuo.jpg'),
  ('中塚さちよ', '中塚さちよ', '/icons/councilors/nakatsuka-sachiyo.jpg'),
  ('中山みずほ', '中山みずほ', '/icons/councilors/nakayama-mizuho.png'),
  ('畠山晋一', '畠山晋一', '/icons/councilors/hatakeyama-shinichi.jpg'),
  ('羽田圭二', '羽田圭二', '/icons/councilors/haneda-keiji.jpg'),
  ('原田竜馬', '原田竜馬', '/icons/councilors/harada-ryoma.jpg'),
  ('ひうち優子', 'ひうち優子', '/icons/councilors/hiuchi-yuko.jpg'),
  ('ひえしま進', 'ひえしま進', '/icons/councilors/hieshima-susumu.jpg'),
  ('平塚けいじ', '平塚けいじ', '/icons/councilors/hiratsuka-keiji.jpg'),
  ('福田たえ美', '福田たえ美', '/icons/councilors/fukuda-taemi.jpg'),
  ('藤井まな', '藤井まな', '/icons/councilors/fujii-mana.jpg'),
  ('真鍋よしゆき', '真鍋よしゆき', '/icons/councilors/manabe-yoshiyuki.jpg'),
  ('みやかおり', 'みやかおり', '/icons/councilors/miya-kaori.jpg'),
  ('桃野芳文', '桃野芳文', '/icons/councilors/momono-yoshifumi.jpg'),
  ('山口ひろひさ', '山口ひろひさ', '/icons/councilors/yamaguchi-hirohisa.jpg'),
  ('若林りさ', '若林りさ', '/icons/councilors/wakabayashi-risa.jpg'),
  ('和田ひでとし', '和田ひでとし', '/icons/councilors/wada-hidetoshi.jpg'),
  ('青空こうじ', '青空こうじ', '/icons/councilors/aozora-koji.jpg')
ON CONFLICT (normalized_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon_url = EXCLUDED.icon_url,
  is_active = TRUE,
  updated_at = NOW();

CREATE TABLE councilor_bill_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  difficulty_level difficulty_level_enum NOT NULL DEFAULT 'normal',
  statement_index SMALLINT NOT NULL,
  councilor_id UUID REFERENCES councilors(id) ON DELETE SET NULL,
  councilor_name TEXT NOT NULL,
  raw_heading TEXT NOT NULL,
  party_or_group TEXT,
  content_md TEXT NOT NULL,
  content_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (bill_id, difficulty_level, statement_index)
);

CREATE INDEX idx_councilor_bill_statements_bill_id
  ON councilor_bill_statements(bill_id);
CREATE INDEX idx_councilor_bill_statements_councilor_id
  ON councilor_bill_statements(councilor_id);
CREATE INDEX idx_councilor_bill_statements_councilor_name
  ON councilor_bill_statements(councilor_name);

CREATE TRIGGER update_councilor_bill_statements_updated_at
  BEFORE UPDATE ON councilor_bill_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE councilor_bill_statements ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON councilors TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON councilor_bill_statements TO service_role;

COMMENT ON TABLE councilor_bill_statements IS '案件Markdownの「議員の意見」から抽出した議員別発言の正規化プロジェクション';
COMMENT ON COLUMN councilor_bill_statements.bill_id IS '元案件ID';
COMMENT ON COLUMN councilor_bill_statements.difficulty_level IS '抽出元の本文難易度。v1ではnormalのみを同期する';
COMMENT ON COLUMN councilor_bill_statements.statement_index IS '案件本文内の発言順序（0始まり）';
COMMENT ON COLUMN councilor_bill_statements.councilor_id IS '議員マスタに一致した場合のID。未登録名はNULL';
COMMENT ON COLUMN councilor_bill_statements.councilor_name IS 'Markdown見出しから正規化した議員名';
COMMENT ON COLUMN councilor_bill_statements.raw_heading IS 'Markdown上の議員見出しテキスト';
COMMENT ON COLUMN councilor_bill_statements.party_or_group IS '見出し括弧内の会派名など';
COMMENT ON COLUMN councilor_bill_statements.content_md IS '議員見出し配下のMarkdown本文';
COMMENT ON COLUMN councilor_bill_statements.content_text IS '集計・検索補助用のプレーンテキスト本文';
