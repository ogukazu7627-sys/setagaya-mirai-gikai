import { IJIME_LEARNING_REVIEWED_AT, IJIME_LESSONS } from "./learning";

export const IJIME_CAMPAIGN_SLUG = "ijime-ordinance-2026";

export const IJIME_CAMPAIGN_TITLE =
  "世田谷区いじめの予防及び解消を実現するための子どもの学びと育ちを支える条例（素案）に関する意見募集";

export const IJIME_ORDINANCE =
  "（仮称）世田谷区いじめの予防及び解消を実現するための子どもの学びと育ちを支える条例（素案）";

export const IJIME_SUBMISSION_DEADLINE = "2026-10-08T23:59:59+09:00";

export const IJIME_OFFICIAL_SUBMISSION_URL =
  "https://www.city.setagaya.lg.jp/pub-comment/02251/35651.html";

export const IJIME_OFFICIAL_INFORMATION_URL =
  "https://www.city.setagaya.lg.jp/02251/35468.html";

export const SETA_HOT_CONSULTATION_URL =
  "https://www.city.setagaya.lg.jp/02236/1400.html";

export const IJIME_SOURCES = [
  {
    id: "public-comment-page",
    kind: "official",
    title: "世田谷区：条例素案への意見募集",
    url: IJIME_OFFICIAL_INFORMATION_URL,
    description: "提出期限、提出できる方、提出方法を確認できます。",
  },
  {
    id: "draft-full",
    kind: "official",
    title: "条例素案（全文）",
    url: "https://www.city.setagaya.lg.jp/documents/35468/soan2.pdf",
    description: "前文骨子と全27条の条文を確認できます。",
  },
  {
    id: "draft-overview",
    kind: "official",
    title: "条例素案（概要版）",
    url: "https://www.city.setagaya.lg.jp/documents/35468/point.pdf",
    description: "基本理念と各章の要点を2ページで確認できます。",
  },
  {
    id: "special-edition",
    kind: "official",
    title: "区のおしらせ「せたがや」条例素案特集号",
    url: "https://www.city.setagaya.lg.jp/kuhou/oshirase20260915pub2/index.html",
    description: "条例を検討した背景や子ども参加の取組を確認できます。",
  },
  {
    id: "child-rights-ordinance",
    kind: "official",
    title: "世田谷区子どもの権利条例",
    url: "https://www.city.setagaya.lg.jp/documents/23496/kaisetu.pdf",
    description: "子どもの意見表明権など、素案の土台となる権利を確認できます。",
  },
  {
    id: "setagaya-basic-policy",
    kind: "official",
    title: "世田谷区いじめ防止基本方針",
    url: "https://www.city.setagaya.lg.jp/02251/1810.html",
    description: "現在の予防・早期発見・早期対応の基本方針です。",
  },
  {
    id: "major-incidents",
    kind: "official",
    title: "世田谷区：いじめの重大事態について",
    url: "https://www.city.setagaya.lg.jp/02251/33958.html",
    description: "重大事態の定義と公表中の調査報告を確認できます。",
  },
  {
    id: "seta-hot",
    kind: "official",
    title: "子どもの権利擁護機関「せたホッと」",
    url: "https://www.city.setagaya.lg.jp/02236/1398.html",
    description:
      "公正・中立な第三者機関の相談・調査・調整の役割を確認できます。",
  },
  {
    id: "mext-guideline",
    kind: "official",
    title: "文部科学省：いじめ重大事態への平時からの備え",
    url: "https://www.mext.go.jp/a_menu/shotou/seitoshidou/1414737_00030.htm",
    description: "疑いの段階から動ける手順や、平時の点検について確認できます。",
  },
] as const;

export type IjimeSource = (typeof IJIME_SOURCES)[number];

export const IJIME_CONTEXT = `
このAIインタビューは、世田谷区が意見を募集している「${IJIME_ORDINANCE}」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月8日です。区は2027年4月の施行を目指していますが、現時点では成立・施行済みの条例ではありません。

## 学習画面と共通の参照情報（確認日：${IJIME_LEARNING_REVIEWED_AT}）
${IJIME_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label ? `${section.label}: ` : ""}${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

## 説明上の重要な区別
- 素案に書かれている事項、現在の制度、ユーザーの経験・評価、ユーザーの提案を混同しないでください。
- 素案第4条から第25条の具体的対応は区立小・中学校の児童生徒が対象です。区立以外や未就学児について同じ対応が直接適用されると説明しないでください。
- 「せたホッと」はすでに存在する公正・中立な第三者機関です。今回の条例で新設される機関として説明しないでください。
- 素案は被害を受けた子どもの安全・安心と尊厳の回復を最優先とし、本人の意向を尊重し、和解や関係継続を被害側だけへ求めないとしています。対話や仲直りを望ましい結論として誘導しないでください。
- いじめを広く認知することと、すべての事案へ同じ対応をすることは別です。子ども同士の対等な葛藤と、苦痛・力関係・継続性がある状況を決めつけず、本人の意見として整理してください。
- 素案本文には、記録の具体的な保存期間、標準的な対応期限、通常時の外部検証、せたホッととの事案ごとの役割分担は細かく示されていません。これらは区へ具体化を求められる論点であり、制度が存在しないと断定しないでください。
`.trim();

export const IJIME_QUESTIONS = [
  {
    id: "relationship",
    topic: "この条例のテーマとの関わり",
    question:
      "今回の素案は、区立小・中学校でのいじめ対応を中心に、学校だけでなく、区・教育委員会・家庭・地域が連携して子どもを支えることを定めています。\n\nあなたは、どのような立場や関心から、この条例について意見を伝えたいですか？",
    quickReplies: [
      "子ども本人として",
      "保護者・家族として",
      "学校・支援に関わる立場として",
      "地域の一員・関心のある区民として",
    ],
    followUp:
      "年齢、学年、学校名、個人名、所属先は尋ねない。子ども本人らしい場合は短く平易な言葉を使い、意見を評価しない。",
  },
  {
    id: "priority",
    topic: "素案の中で、特に考えたい論点",
    question:
      "素案は、被害を受けた子どもの安全を最優先にしながら、処罰や責任追及そのものを目的とせず、関係する子どもの背景を理解し、支援や関係の調整を通じて解消・再発防止につなげる考え方です。\n\nこの対応の考え方や、予防・早期発見、学校を支える体制、重大事態の調査などについて、特に掘り下げたいのはどの部分ですか？",
    quickReplies: [
      "予防・早期発見",
      "支援・関係の調整",
      "学校を支える体制",
      "重大事態の調査",
    ],
    followUp:
      "選ばれた論点を中心にする。他の選択肢もあると伝えられるが、一度に複数の問いを出さない。",
  },
  {
    id: "experience",
    topic: "経験や実感から、その論点を掘り下げる",
    question:
      "素案では、本人から明確な被害の申告がなくても必要な確認につなげることや、重大事態の調査中にも支援を進めることなど、対応の各段階で学校や教育委員会が行うことを定めています。\n\nいま挙げていただいた点について、これまで見聞きした学校や周囲の対応で、助けになったことや、支援が届かなかったと感じたことはありますか？",
    quickReplies: [
      "助けになった対応がある",
      "支援が届かなかったことがある",
      "対応にばらつきを感じた",
      "経験ではなく制度への希望を話したい",
    ],
    followUp:
      "実体験の詳細を求めない。経験、見聞きしたこと、推測、制度への評価を必要に応じて区別する。つらい記憶の再説明を求めない。",
  },
  {
    id: "voice-and-safety",
    topic: "子どもの意向と安全を、実際の対応でどう守るか",
    question:
      "素案は、子どもの意向を尊重し、対話や環境の調整を通じて関係の改善を支える方針です。また、被害を受けた子どもだけに和解や関係の継続を求めるものではないとしています。\n\n子どもが対話を望む場合も、相手と距離を置きたい場合も含め、本人の気持ちと安全を守るために、どのようなルールが必要だと思いますか？",
    quickReplies: [
      "話したくないことを尊重する",
      "対話や仲直りを強制しない",
      "安心できる場所と学びを確保する",
      "相談後の不利益や孤立を防ぐ",
    ],
    followUp:
      "対話・和解を前提にしない。大人の保護責任を子どもの相談行動や自助努力へ置き換えない。",
  },
  {
    id: "implementation",
    topic: "学校や教育委員会が、確実に動くための仕組み",
    question:
      "素案では、特定の先生だけに対応を任せず、学校が組織として対応し、教育委員会が人員や専門職、相談体制の面で学校を支えることを定めています。\n\n相談や気づきを実際の対応につなげるため、「誰が・いつまでに・何をするか」について、特に明確にしてほしいことは何ですか？",
    quickReplies: [
      "対応期限と経過の説明",
      "記録と引き継ぎ",
      "学校を支える人員・専門職",
      "第三者機関との役割分担",
    ],
    followUp:
      "誰が、いつ、何を確認し、本人へどう説明するかを具体化する。現行制度にないと断定しない。",
  },
  {
    id: "proposal",
    topic: "条例の文言や、施行後の運用への具体的な提案",
    question:
      "素案は、条例の基本理念を踏まえて教育委員会が基本方針を定め、各区立学校も実情に応じた方針を定めて実施する構成です。\n\nここまでのお話を踏まえ、「条例そのものに明記してほしいこと」や「学校・教育委員会の運用で具体化してほしいこと」を、合わせて１〜３個挙げると何ですか？",
    quickReplies: [
      "条例の文言を明確にする",
      "規則や基本方針で手順を定める",
      "実施状況を定期的に検証・公表する",
      "子どもが使いやすい説明と相談導線をつくる",
    ],
    followUp:
      "本人の価値判断を保ち、実施主体、方法、確認方法の順で具体化する。AIから新しい要求を足さない。",
  },
  {
    id: "final",
    topic: "この条例について、区に最も伝えたいこと",
    question:
      "今回の条例によって、子どもの日常の学校生活や、いじめが起きたときの対応が、どのようになってほしいですか？ ここまでのお話の中から、区に最も伝えたいことを、あなた自身の言葉で教えてください。これまでの質問では触れられなかったことがあれば、それでも構いません。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。下書きへ進めるための最終確認とする。",
  },
] as const;

export type IjimeQuestion = (typeof IJIME_QUESTIONS)[number];
