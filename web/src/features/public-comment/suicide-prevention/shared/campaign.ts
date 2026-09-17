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
      "今回の素案は、こころの不調だけでなく、生活困窮、仕事、育児・介護、孤立なども含め、関係機関が連携する計画です。\n\nあなたは、どのような立場や関心から、この計画について意見を伝えたいですか？ 個人的なつらい経験や医療情報を話す必要はありません。",
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
    topic: "素案の中で、特に考えたい論点",
    question:
      "素案は、子ども・若者と勤労世代への支援を重点としています。同時に、相談や居場所、普及啓発、ゲートキーパー等の人材育成、救急医療や福祉との連携、目標と進行管理を定めています。\n\nこの中で、特に意見を伝えたいのはどの部分ですか？",
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
    topic: "相談や支援につながるまでの課題",
    question:
      "素案は、対面・電話相談、居場所、子どもSOS相談フォームに加え、SNS等の相談手段も検討しています。\n\n今挙げていただいた論点について、必要な人が相談や支援につながるために、役立つと思うことや、利用を難しくすると思うことはありますか？ ご自身の経験を話す必要はなく、制度への期待や心配でも構いません。",
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
    topic: "支援を途切れさせない仕組み",
    question:
      "素案は、医療機関、学校、福祉、職場、地域などが連携し、見守りから支援、継続的なフォローまでをつなぐ方針です。\n\n相談先を紹介して終わらず、本人の同意とプライバシーを守りながら支援を続けるために、どのような引継ぎや確認の仕組みが必要だと思いますか？",
    quickReplies: [
      "本人の同意を確かめる",
      "引継ぎ先と担当を明確にする",
      "支援後の連絡・同行・経過確認を行う",
      "つながらなかった場合も振り返る",
    ],
    followUp:
      "特定の支援モデルを押しつけない。情報共有は常に必要と断定せず、本人の同意、共有範囲、引継ぎ主体、経過確認、中断時の対応のうち、ユーザーが重視する点を整理する。",
  },
  {
    id: "supporters",
    topic: "周囲の人と支援者が抱え込まないために",
    question:
      "素案は、家族、友人、教職員、職場の上司・同僚などが変化に気づき、話を聴き、専門的な支援につなぐ取組を進めています。一方、周囲の人や支援者が一人で解決責任を抱えるものではありません。\n\n気づいた人が安心して相談・連携でき、支える側も抱え込まないために、区や関係機関にどのような支援やルールを明確にしてほしいですか？",
    quickReplies: [
      "迷ったときの相談先を明確にする",
      "話の聴き方とつなぎ方を研修する",
      "緊急性の判断を専門職に相談できる",
      "家族・教職員・支援者自身も支える",
    ],
    followUp:
      "家族、友人、教職員、管理職に診断・治療・監視・単独での解決責任を負わせない。研修受講者数だけでなく、迷ったときの相談、専門機関への接続、支援者自身のケアの観点も整理する。",
  },
  {
    id: "proposal",
    topic: "計画の実施と評価への具体的な提案",
    question:
      "素案は、自殺死亡率の３年間平均を基準値から「減少」させることや、相談できる人の割合等を「増やす」ことを目標としています。進行管理は自殺対策協議会が担います。\n\nここまでのお話を踏まえ、「計画にもっと明確に書いてほしいこと」や「実施・評価の方法として具体化してほしいこと」を、１〜３個挙げると何ですか？",
    quickReplies: [
      "誰が・いつまでに・何を行うか示す",
      "人員・予算・対応時間を具体化する",
      "相談後の接続・継続を指標にする",
      "実施状況と改善判断を公表する",
    ],
    followUp:
      "ユーザーの価値判断を保ち、計画本文、年度ごとの実施、人員・予算、運用手順、評価・公表のどの層への提案かを整理する。AIから新しい数値目標や要求を追加しない。",
  },
  {
    id: "final",
    topic: "区に最も伝えたいこと",
    question:
      "今回の自殺対策計画について、区へ最も伝えたいことは何ですか？ 実現してほしい支援や地域のあり方、大切にしてほしい考え方、懸念していることなど、提出する意見に必ず残したいことを、あなたの言葉で教えてください。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。個人的な危機や医療情報の詳細を最終意見として求めない。下書きへ進めるための最終確認とする。",
  },
] as const;

export type SuicidePreventionQuestion =
  (typeof SUICIDE_PREVENTION_QUESTIONS)[number];
