import {
  SUICIDE_PREVENTION_LEARNING_REVIEWED_AT,
  SUICIDE_PREVENTION_LESSONS,
} from "./learning";

export const SUICIDE_PREVENTION_CAMPAIGN_SLUG = "suicide-prevention-plan-2026";

export const SUICIDE_PREVENTION_CAMPAIGN_TITLE =
  "世田谷区自殺対策計画（素案）の意見募集";

export const SUICIDE_PREVENTION_PLAN = "世田谷区自殺対策計画（素案）";

export const SUICIDE_PREVENTION_SUBMISSION_DEADLINE =
  "2026-10-06T23:59:59+09:00";

export const SUICIDE_PREVENTION_OFFICIAL_SUBMISSION_URL =
  "https://www.city.setagaya.lg.jp/pub-comment/02244/34011.html";

export const SUICIDE_PREVENTION_OFFICIAL_INFORMATION_URL =
  "https://www.city.setagaya.lg.jp/02244/34488.html";

export const SUICIDE_PREVENTION_SUPPORT_URL =
  "https://www.city.setagaya.lg.jp/02244/3284.html";

export const MHLW_SUPPORT_URL =
  "https://www.mhlw.go.jp/mamorouyokokoro/soudan/";

export const SUICIDE_PREVENTION_SOURCES = [
  {
    id: "public-comment-page",
    kind: "official",
    title: "世田谷区：自殺対策計画素案への意見募集",
    url: SUICIDE_PREVENTION_OFFICIAL_INFORMATION_URL,
    description: "提出期限、提出できる方、提出方法を確認できます。",
  },
  {
    id: "draft-summary",
    kind: "official",
    title: "世田谷区自殺対策計画素案（概要版）",
    url: "https://www.city.setagaya.lg.jp/documents/34488/keikakugaiyoubann.pdf",
    description: "現状、重点施策、基本施策、目標指標、主な事業を概観できます。",
  },
  {
    id: "draft-full",
    kind: "official",
    title: "世田谷区自殺対策計画素案（本編）",
    url: "https://www.city.setagaya.lg.jp/documents/34488/keikaku.pdf",
    description: "統計、調査結果、施策体系、事業内容、推進体制を確認できます。",
  },
  {
    id: "current-plan",
    kind: "official",
    title: "世田谷区：自殺対策計画の策定経過と現行基本方針",
    url: "https://www.city.setagaya.lg.jp/02244/27481.html",
    description:
      "2019年の基本方針、調査、協議会と今回の計画の関係を確認できます。",
  },
  {
    id: "mental-health-support",
    kind: "official",
    title: "世田谷区：こころの不調や悩みの相談先",
    url: SUICIDE_PREVENTION_SUPPORT_URL,
    description: "区のこころの健康相談、夜間電話、SNS相談案内を確認できます。",
  },
  {
    id: "kokoro-space",
    kind: "official",
    title: "世田谷区：こころスペース",
    url: "https://www.city.setagaya.lg.jp/02244/3292.html",
    description:
      "思春期・青年期の人と家族等が利用できる、予約不要の相談の場です。",
  },
  {
    id: "child-sos",
    kind: "official",
    title: "世田谷区教育委員会：子どもSOS相談フォーム",
    url: "https://www.city.setagaya.lg.jp/kyouikuiinkai/shien/12434.html",
    description: "区立小・中学生が学習者用タブレットから相談を送る仕組みです。",
  },
  {
    id: "nerima-collaboration",
    kind: "official",
    title: "練馬区：救急医療機関との自殺未遂者等支援協定",
    url: "https://www.city.nerima.tokyo.jp/kusei/koho/hodo/r6/r603/20240327-2.html",
    description: "本人等の同意を得て病院から区の地域支援へつなぐ比較例です。",
  },
  {
    id: "amended-law-notice",
    kind: "official",
    title: "文部科学省：改正自殺対策基本法の施行通知",
    url: "https://www.mext.go.jp/a_menu/shotou/seitoshidou/1414737_00031.htm",
    description:
      "子どもの支援、関係機関の連携、自殺未遂者等への継続支援に関する改正内容を確認できます。",
  },
] as const;

export type SuicidePreventionSource =
  (typeof SUICIDE_PREVENTION_SOURCES)[number];

export const SUICIDE_PREVENTION_CONTEXT = `
このAIインタビューは、世田谷区が意見を募集している「${SUICIDE_PREVENTION_PLAN}」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月6日です。計画期間は2027年度から2031年度までの5年間で、現在は素案の段階です。

## 学習画面と共通の参照情報（確認日：${SUICIDE_PREVENTION_LEARNING_REVIEWED_AT}）
${SUICIDE_PREVENTION_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label ? `${section.label}: ` : ""}${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

## 説明上の重要な区別
- 今回は新しい条例案ではなく、2019年の「世田谷区自殺対策基本方針」などの取組を引き継ぐ2027〜2031年度の施策をまとめる計画素案です。
- 重点対象は「子ども・若者」と「勤労世代」ですが、高齢者、障害のある人、生活に困っている人などを支援対象から外す計画ではありません。
- SNS等による相談手段は「導入を検討」する取組です。区独自の24時間対応や開始時期が決定したと説明しないでください。
- ゲートキーパーは、気づき、話を聴き、必要な支援につなぎ、見守る役割です。診断や治療を行う専門職の代わりではなく、一人で解決責任を抱える役割でもありません。
- 素案は救急医療機関と連携し、治療後も相談や福祉サービスにつなぐ体制づくりを進めるとしています。練馬区の仕組みは比較例であり、世田谷区の具体的な手順として決定したものではありません。
- 自殺死亡率の目標は、2022〜2024年の3年間の平均12.3を基準に「減少」としています。減少幅まで決定していると説明しないでください。
- 自殺対策協議会と各事業の所管課は素案に位置づけられています。責任主体や評価体制が全く書かれていないと断定せず、実施時期、人員・予算、引継ぎ手順、達成状況の公開など、さらに具体化してほしい点として整理してください。
`.trim();

export const SUICIDE_PREVENTION_QUESTIONS = [
  {
    id: "relationship",
    topic: "この計画との関わり",
    question:
      "こころの健康や、学校・職場・暮らしの困りごとへの支援について、あなたはどのような立場や関心から、この計画に意見を伝えたいですか？\n\n支援を利用する立場、家族や身近な人を支える立場、教育・医療・福祉・職場・地域活動への関わりなど、話せる範囲で教えてください。直接の経験がなくても、地域の取組への関心から答えて構いません。",
    quickReplies: [
      "区民として",
      "子ども・若者や家族の立場から",
      "職場・学校・支援に関わる立場から",
      "地域の孤立やこころの健康に関心がある",
    ],
    followUp:
      "年齢、学校名、勤務先、医療機関、診断名、治療歴、住所、個人名を尋ねない。つらい経験の詳細な説明を求めず、政策への関心に必要な範囲で整理する。",
  },
  {
    id: "priority",
    topic: "特に考えたい取組や論点",
    question:
      "この素案には、子ども・若者への支援、職場での気づきや対応、相談窓口や居場所の充実、相談・治療後の支援の継続、身近な人を亡くした人への支援などが盛り込まれています。\n\nこれらの取組や、計画の目標・成果の確かめ方について、あなたが特に大切だと思うこと、または気になっていることは何ですか？ ここに挙げていない内容でも構いません。",
    quickReplies: [
      "子ども・若者への支援",
      "勤労世代・職場への取組",
      "相談手段・居場所・支援へのつなぎ",
      "目標・連携・実施状況の評価",
    ],
    followUp:
      "選ばれた論点を中心にする。列挙した項目以外の論点も受け入れ、計画全体への賛成・反対を先に決めさせない。",
  },
  {
    id: "access",
    topic: "経験や期待から見える、支援の受けやすさ",
    question:
      "いま挙げていただいた点について、助けになった支援や対応、反対に利用しづらいと感じたことはありますか？\n\n例えば、相談先の見つけやすさ、相談できる時間、安心して話せる対応、相談した後の支援など、話せる範囲で教えてください。経験を話す代わりに、『こうであれば安心して利用できる』という期待や、制度への希望を教えていただいても構いません。",
    quickReplies: [
      "時間・場所・相談方法の選びやすさ",
      "匿名性・プライバシーへの安心",
      "相談先が分かる情報と案内",
      "相談を受ける人員・専門性・対応時間",
    ],
    followUp:
      "自殺念慮、自傷、自殺未遂、死別などの個人的な経験の告白を求めない。利用前、受付時、対応中のどの段階に課題があるかを、政策として具体化する。",
  },
  {
    id: "continuity",
    topic: "区が示す目的や取組について、納得できる点と不十分な点",
    question:
      "区は、子ども・若者と勤労世代への支援を重点に、相談や居場所の充実、身近な人の変化に気づいて支援につなぐための研修、学校・医療・福祉などの連携を進めるとしています。\n\nこうした計画の目的や取組の内容について、あなたが納得できる点と、まだ不十分だと思う点はどこですか？ 先ほど挙げた論点に沿って教えてください。判断するために、もっと説明してほしい点でも構いません。",
    quickReplies: [
      "納得できる点から話す",
      "不十分だと思う点から話す",
      "納得できる点と不十分な点の両方がある",
      "判断に必要な説明が足りない",
    ],
    followUp:
      "納得できる点と不十分な点の両方を無理に挙げさせない。ユーザーが選んだ論点に沿い、素案に書かれた目的・取組への評価と、判断に必要な追加説明を区別して整理する。",
  },
  {
    id: "supporters",
    topic: "支援が実際に届くための条件と、確認の方法",
    question:
      "素案では、関係機関の連携を強め、見守りから支援、その後の継続的なフォローまでつなぐことや、自殺未遂を経験した人が治療後も相談・福祉サービスにつながれる体制づくりを掲げています。\n\nあなたが挙げた課題について、必要な支援が届き、途中で途切れないために、どのような対応や役割分担が必要だと思いますか？ また、それが実際にできているかを、区はどのように確認すればよいと思いますか？",
    quickReplies: [
      "引継ぎ先と担当を明確にする",
      "本人の同意と情報共有の範囲を確かめる",
      "支援後の経過を確認する",
      "支援への接続や中断の状況を公表する",
    ],
    followUp:
      "特定の支援モデルを押しつけない。本人の同意、共有範囲、引継ぎ主体、経過確認、中断時の対応、成果指標のうち、ユーザーが重視する条件と確認方法を整理する。家族や身近な人だけに責任を負わせない。",
  },
  {
    id: "proposal",
    topic: "計画や実施方法に、具体的に反映してほしいこと",
    question:
      "ここまでの話を踏まえて、素案の内容や実際の支援について、区に修正・追加・明確化してほしいことは何ですか？\n\n相談の受付時間や方法、支援に当たる人の体制、学校・医療・福祉の引継ぎ、取組の実施時期、目標や進捗の示し方など、あなたが選んだ論点に関わるところから教えてください。現在の取組を維持・継続してほしいという意見でも構いません。",
    quickReplies: [
      "相談の受付時間・方法",
      "支援に当たる人の体制",
      "関係機関の引継ぎ・実施時期",
      "目標・進捗の示し方",
    ],
    followUp:
      "ユーザーの価値判断を保ち、計画本文、年度ごとの実施、人員・予算、運用手順、評価・公表のどの層への提案かを整理する。AIから新しい数値目標や要求を追加しない。",
  },
  {
    id: "final",
    topic: "区に最も伝えたいこと",
    question:
      "ここまでのお話を踏まえて、世田谷区の自殺対策で、何を最も大切にしてほしいですか？\n\n『どのような状況にある人に、どのような支援が届いてほしいか』や、『計画に残してほしいこと・変えてほしいこと』が伝わるように、区への一番のメッセージを一文程度で教えてください。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。個人的な危機や医療情報の詳細を最終意見として求めない。下書きへ進めるための最終確認とする。",
  },
] as const;

export type SuicidePreventionQuestion =
  (typeof SUICIDE_PREVENTION_QUESTIONS)[number];
