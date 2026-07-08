export const DEFAULT_COUNCILOR_ICON_URL = "/icons/councilor-default.svg";

export const COUNCILOR_ICON_URLS: Record<string, string> = {
  阿久津皇: "/icons/councilors/akutsu-hikaru.jpg",
  石川ナオミ: "/icons/councilors/ishikawa-naomi.jpg",
  石原せいじ: "/icons/councilors/ishihara-seiji.jpg",
  いたいひとし: "/icons/councilors/itai-hitoshi.jpg",
  大庭正明: "/icons/councilors/oba-masaaki.jpg",
  岡川大記: "/icons/councilors/okagawa-daiki.jpg",
  岡本のぶ子: "/icons/councilors/okamoto-nobuko.jpg",
  おぎのけんじ: "/icons/councilors/ogino-kenji.png",
  おのみずき: "/icons/councilors/ono-mizuki.jpg",
  オルズグル: "/icons/councilors/oruzuguru.jpg",
  加藤たいき: "/icons/councilors/kato-taiki.jpg",
  神尾りさ: "/icons/councilors/kamio-risa.jpg",
  上川あや: "/icons/councilors/kamikawa-aya.jpg",
  川上こういち: "/icons/councilors/kawakami-koichi.png",
  河村みどり: "/icons/councilors/kawamura-midori.jpg",
  くろだあいこ: "/icons/councilors/kuroda-aiko.jpg",
  河野俊弘: "/icons/councilors/kono-toshihiro.jpg",
  坂口賢一: "/icons/councilors/sakaguchi-kenichi.jpg",
  坂本みえこ: "/icons/councilors/sakamoto-mieko.jpg",
  桜井純子: "/icons/councilors/sakurai-junko.jpg",
  佐藤ひろと: "/icons/councilors/sato-hiroto.png",
  佐藤正幸: "/icons/councilors/sato-masayuki.jpg",
  佐藤美樹: "/icons/councilors/sato-miki.jpg",
  宍戸三郎: "/icons/councilors/shishido-saburo.jpg",
  下山芳男: "/icons/councilors/shimoyama-yoshio.jpg",
  関口江利子: "/icons/councilors/sekiguchi-eriko.jpg",
  そのべせいや: "/icons/councilors/sonobe-seiya.png",
  たかじょう訓子: "/icons/councilors/takajo-noriko.jpg",
  高橋昭彦: "/icons/councilors/takahashi-akihiko.jpg",
  田中優子: "/icons/councilors/tanaka-yuko.png",
  津上仁志: "/icons/councilors/tsugami-hitoshi.jpg",
  つるみけんご: "/icons/councilors/tsurumi-kengo.jpg",
  中里光夫: "/icons/councilors/nakazato-mitsuo.jpg",
  中塚さちよ: "/icons/councilors/nakatsuka-sachiyo.jpg",
  中山みずほ: "/icons/councilors/nakayama-mizuho.png",
  畠山晋一: "/icons/councilors/hatakeyama-shinichi.jpg",
  羽田圭二: "/icons/councilors/haneda-keiji.jpg",
  原田竜馬: "/icons/councilors/harada-ryoma.jpg",
  ひうち優子: "/icons/councilors/hiuchi-yuko.jpg",
  ひえしま進: "/icons/councilors/hieshima-susumu.jpg",
  平塚けいじ: "/icons/councilors/hiratsuka-keiji.jpg",
  福田たえ美: "/icons/councilors/fukuda-taemi.jpg",
  藤井まな: "/icons/councilors/fujii-mana.jpg",
  真鍋よしゆき: "/icons/councilors/manabe-yoshiyuki.jpg",
  みやかおり: "/icons/councilors/miya-kaori.jpg",
  桃野芳文: "/icons/councilors/momono-yoshifumi.jpg",
  山口ひろひさ: "/icons/councilors/yamaguchi-hirohisa.jpg",
  若林りさ: "/icons/councilors/wakabayashi-risa.jpg",
  和田ひでとし: "/icons/councilors/wada-hidetoshi.jpg",
  青空こうじ: "/icons/councilors/aozora-koji.jpg",
};

export function normalizeCouncilorText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function getCouncilorPartyOrGroup(headingText: string): string | null {
  const normalized = normalizeCouncilorText(headingText);
  const match = normalized.match(/[（(]([^）)]*?)[）)]/u);
  return match?.[1] ? normalizeCouncilorText(match[1]) : null;
}

export function normalizeCouncilorName(headingText: string): string {
  const normalized = normalizeCouncilorText(headingText);
  const withoutParty = normalizeCouncilorText(
    normalized.replace(/[（(].*?[）)]/gu, "")
  );
  const withoutSuffix = normalizeCouncilorText(
    withoutParty.replace(/議員$/u, "")
  );

  return normalizeCouncilorText(withoutSuffix.replace(/\s+/g, ""));
}

export function getCouncilorNameCandidates(headingText: string): string[] {
  const normalized = normalizeCouncilorText(headingText);
  const withoutParty = normalizeCouncilorText(
    normalized.replace(/[（(].*?[）)]/g, "")
  );
  const withoutSuffix = normalizeCouncilorText(
    withoutParty.replace(/議員$/u, "")
  );
  const withoutSpaces = normalizeCouncilorText(
    withoutSuffix.replace(/\s+/g, "")
  );

  return Array.from(
    new Set(
      [
        normalized,
        withoutParty,
        withoutSuffix,
        withoutSpaces,
        normalizeCouncilorName(headingText),
      ].filter(Boolean)
    )
  );
}

export function getCouncilorIconUrl(
  headingText: string,
  iconUrlByName: Record<string, string> = COUNCILOR_ICON_URLS,
  defaultIconUrl = DEFAULT_COUNCILOR_ICON_URL
): string {
  for (const candidate of getCouncilorNameCandidates(headingText)) {
    const iconUrl = iconUrlByName[candidate];
    if (iconUrl) {
      return iconUrl;
    }
  }

  return defaultIconUrl;
}
