import { MINPAKU_LEARNING_REVIEWED_AT, MINPAKU_LESSONS } from "./learning";

export const MINPAKU_CAMPAIGN_SLUG = "minpaku-2026";

export const MINPAKU_CAMPAIGN_TITLE =
  "民泊・旅館業の条例改正素案へのパブリックコメント";

export const MINPAKU_SUBMISSION_DEADLINE = "2026-10-06T23:59:59+09:00";

export const MINPAKU_OFFICIAL_SUBMISSION_URL =
  "https://www.city.setagaya.lg.jp/pub-comment/02245/34014.html";

export const MINPAKU_OFFICIAL_INFORMATION_URL =
  "https://www.city.setagaya.lg.jp/02245/35467.html";

export const MINPAKU_SOURCES = [
  {
    id: "public-comment-page",
    kind: "official",
    title: "区民意見募集の案内",
    url: MINPAKU_OFFICIAL_INFORMATION_URL,
    description: "募集対象、提出期限、提出方法、提出先を確認できます。",
  },
  {
    id: "setagaya-position",
    kind: "official",
    title: "条例改正素案に対する区の考え",
    url: "https://www.city.setagaya.lg.jp/02245/35770.html",
    description: "改正の経緯、目的、主な改正点、今後の取組を確認できます。",
  },
  {
    id: "draft-overview",
    kind: "official",
    title: "改正素案概要",
    url: "https://www.city.setagaya.lg.jp/documents/35467/kaiseisoangaiyou.pdf",
    description: "2つの条例改正素案の概要を確認できます。",
  },
  {
    id: "ryokan-draft",
    kind: "official",
    title: "旅館業法施行条例改正素案・新旧対照表",
    url: "https://www.city.setagaya.lg.jp/documents/35467/ryokangyousoan.pdf",
    description: "旅館業法施行条例の改正内容を確認できます。",
  },
  {
    id: "housing-draft",
    kind: "official",
    title: "住宅宿泊事業条例改正素案・新旧対照表",
    url: "https://www.city.setagaya.lg.jp/documents/35467/juutakusyukuhakusoan.pdf",
    description: "住宅宿泊事業条例の改正内容を確認できます。",
  },
  {
    id: "ryokan-procedure",
    kind: "official",
    title: "旅館業の手続き",
    url: "https://www.city.setagaya.lg.jp/02245/3225.html",
    description: "旅館業の営業許可について確認できます。",
  },
  {
    id: "housing-procedure",
    kind: "official",
    title: "住宅宿泊事業（民泊）について",
    url: "https://www.city.setagaya.lg.jp/02245/3247.html",
    description: "住宅宿泊事業の届出と制度について確認できます。",
  },
  {
    id: "national-minpaku-faq",
    kind: "official",
    title: "観光庁：民泊制度のよくあるご質問",
    url: "https://www.mlit.go.jp/kankocho/minpaku/faq.html",
    description: "住宅宿泊事業と旅館業の違い、営業日数の制限を確認できます。",
  },
  {
    id: "shinjuku-policy",
    kind: "official",
    title: "新宿区：2026年9月8日記者会見（条例改正に向けた方針）",
    url: "https://www.city.shinjuku.lg.jp/kucho/message/20260908.html",
    description:
      "新設・営業日数の制限と既存施設への経過措置の方針です。施行済みのルールではありません。",
  },
  {
    id: "toshima-amendment",
    kind: "official",
    title: "豊島区：改正条例の新旧対照表",
    url: "https://www.city.toshima.lg.jp/documents/54011/jyourei20251215.pdf",
    description:
      "区域・期間の制限、既存届出住宅等の特例、2026年12月16日の施行日を確認できます。",
  },
  {
    id: "toshima-rules",
    kind: "official",
    title: "豊島区：住宅宿泊事業法について",
    url: "https://www.city.toshima.lg.jp/214/kurashi/ese/kankyoese/minpaku.html",
    description:
      "住宅宿泊事業の手続きと区域・期間制限の適用時期を確認できます。",
  },
  {
    id: "suginami-rules",
    kind: "official",
    title: "杉並区：住宅宿泊事業（民泊）の現行ルール",
    url: "https://www.city.suginami.tokyo.jp/s046/871.html",
    description:
      "住居専用地域の家主不在型に対する平日制限と休日の例外を確認できます。",
  },
  {
    id: "hieshima-response",
    kind: "opinion",
    title: "ひえしま進議員の発信：民泊・旅館業の苦情対応について",
    url: "https://hieshimasusumu.com/blog/4632/",
    description:
      "議員本人の質問・主張の紹介です。行政の公式見解や区民全体の意見を示すものではありません。",
  },
  {
    id: "hieshima-opposition",
    kind: "opinion",
    title: "ひえしま進議員の発信：2026年9月7日の改正素案への反対意見",
    url: "https://hieshimasusumu.com/blog/5343/",
    description:
      "議員個人の見解を確認する資料です。制度の説明は行政資料と区別して扱います。",
  },
] as const;

export type MinpakuSource = (typeof MINPAKU_SOURCES)[number];

export const MINPAKU_CONTEXT = `
このAIインタビューは、世田谷区が募集している「世田谷区旅館業法施行条例（改正素案）」と「世田谷区住宅宿泊事業の適正な運営に関する条例（改正素案）」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月6日です。

## 学習画面と共通の参照情報（確認日：${MINPAKU_LEARNING_REVIEWED_AT}）
${MINPAKU_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label}: ${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

世田谷区の改正素案は確認日時点で意見募集中であり、成立・施行済みのルールではありません。他区の制度を世田谷区のルールとして説明せず、改正方針・公布済みで施行前の規定・現行ルールを区別してください。
行政の公式資料と議員個人の主張を区別してください。ひえしま進議員の発信は同議員の見解であり、区の公式見解や区民全体の意見として扱わないでください。議員の評価を客観的事実として断定せず、その主張への賛同・反対をユーザーに求めないでください。
ユーザーの経験や評価は、事実として断定せず、本人の意見・経験として扱ってください。
学習の受講状況やクイズの回答・正誤は提供されません。受講したことや正解したことを推測せず、区の説明や改正素案への賛同と解釈しないでください。
`.trim();

export const MINPAKU_QUESTIONS = [
  {
    id: "relationship",
    topic: "関わり方",
    question: "このテーマに、あなたはどのような関わりがありますか？",
    quickReplies: [
      "近隣で暮らしている",
      "区内に住んでいる",
      "民泊・旅館業に関わっている",
      "制度に関心がある",
    ],
    followUp:
      "関わり方を尊重し、個人名、住所、施設名などの特定情報は尋ねない。",
  },
  {
    id: "priority",
    topic: "関心のある論点",
    question: "この改正素案について、特に気になっている点はどれですか？",
    quickReplies: [
      "騒音やごみ",
      "防災・安全",
      "苦情への対応",
      "営業制限や地域との共生",
    ],
    followUp: "選ばれた論点を1つに絞り、なぜ重要なのかを本人の言葉で聞く。",
  },
  {
    id: "experience",
    topic: "経験と影響",
    question:
      "その点について、具体的な経験や不安、期待していることを教えてください。",
    quickReplies: [
      "自分の生活への影響",
      "地域への影響",
      "行政の対応への不安",
      "事業者との共生への期待",
    ],
    followUp:
      "経験、見聞きしたこと、推測を分けて確認し、被害や違法性を断定しない。",
  },
  {
    id: "understanding",
    topic: "区の説明との関係",
    question:
      "区が説明している改正の目的や内容について、納得できる点と、まだ不十分だと思う点はありますか？",
    quickReplies: [
      "目的には納得している",
      "実効性が気になる",
      "営業機会の見直しが気になる",
      "説明をもっと確認したい",
    ],
    followUp:
      "区の説明とユーザーの評価を分け、区の立場を受け入れるよう誘導しない。",
  },
  {
    id: "conditions",
    topic: "必要な条件",
    question:
      "適正な運営を認めるために、どのような条件や確認方法が必要だと思いますか？",
    quickReplies: [
      "対応時間の基準",
      "苦情記録の確認",
      "事前説明の実効性",
      "違反時の取消しや公表",
    ],
    followUp: "条件を具体化し、誰がいつどのように確認するかまで掘り下げる。",
  },
  {
    id: "proposal",
    topic: "具体的な提案",
    question: "区に対して、具体的にどのような修正や運用改善を求めたいですか？",
    quickReplies: [
      "条例の文言を明確にしてほしい",
      "監視・指導を強化してほしい",
      "事業者との共生条件を明確にしてほしい",
      "地域ごとの影響を検討してほしい",
    ],
    followUp: "要望を1〜3個に絞り、誰に何をしてほしいのかを明確にする。",
  },
  {
    id: "final",
    topic: "最終確認",
    question:
      "ここまでの内容を踏まえて、区に最も伝えたいことを一言で表すと何ですか？",
    quickReplies: [],
    followUp:
      "本人の言葉を尊重し、AIが新しい主張を追加せず、下書き作成へ進む。",
  },
] as const;

export type MinpakuQuestion = (typeof MINPAKU_QUESTIONS)[number];

export const MINPAKU_ORDINANCES = [
  "世田谷区旅館業法施行条例（改正素案）",
  "世田谷区住宅宿泊事業の適正な運営に関する条例（改正素案）",
] as const;
