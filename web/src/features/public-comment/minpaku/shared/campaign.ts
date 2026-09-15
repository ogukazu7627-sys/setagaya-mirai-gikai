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
    title: "区民意見募集の案内",
    url: MINPAKU_OFFICIAL_INFORMATION_URL,
    description: "募集対象、提出期限、提出方法、提出先を確認できます。",
  },
  {
    id: "setagaya-position",
    title: "条例改正素案に対する区の考え",
    url: "https://www.city.setagaya.lg.jp/02245/35770.html",
    description: "改正の経緯、目的、主な改正点、今後の取組を確認できます。",
  },
  {
    id: "draft-overview",
    title: "改正素案概要",
    url: "https://www.city.setagaya.lg.jp/documents/35467/kaiseisoangaiyou.pdf",
    description: "2つの条例改正素案の概要を確認できます。",
  },
  {
    id: "ryokan-draft",
    title: "旅館業法施行条例改正素案・新旧対照表",
    url: "https://www.city.setagaya.lg.jp/documents/35467/ryokangyousoan.pdf",
    description: "旅館業法施行条例の改正内容を確認できます。",
  },
  {
    id: "housing-draft",
    title: "住宅宿泊事業条例改正素案・新旧対照表",
    url: "https://www.city.setagaya.lg.jp/documents/35467/juutakusyukuhakusoan.pdf",
    description: "住宅宿泊事業条例の改正内容を確認できます。",
  },
  {
    id: "ryokan-procedure",
    title: "旅館業の手続き",
    url: "https://www.city.setagaya.lg.jp/02245/3225.html",
    description: "旅館業の営業許可について確認できます。",
  },
  {
    id: "housing-procedure",
    title: "住宅宿泊事業（民泊）について",
    url: "https://www.city.setagaya.lg.jp/02245/3247.html",
    description: "住宅宿泊事業の届出と制度について確認できます。",
  },
] as const;

export type MinpakuSource = (typeof MINPAKU_SOURCES)[number];

export const MINPAKU_CONTEXT = `
このAIインタビューは、世田谷区が募集している「世田谷区旅館業法施行条例（改正素案）」と「世田谷区住宅宿泊事業の適正な運営に関する条例（改正素案）」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月6日です。

## 学習画面と共通の公式情報の要約（確認日：${MINPAKU_LEARNING_REVIEWED_AT}）
${MINPAKU_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label}: ${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

この説明は区の公式資料を要約したものであり、条例が成立・施行済みであることを意味しません。ユーザーの経験や評価は、事実として断定せず、本人の意見・経験として扱ってください。
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
