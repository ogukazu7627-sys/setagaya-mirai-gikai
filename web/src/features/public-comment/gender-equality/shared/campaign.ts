import {
  GENDER_EQUALITY_LEARNING_REVIEWED_AT,
  GENDER_EQUALITY_LESSONS,
} from "./learning";

export const GENDER_EQUALITY_CAMPAIGN_SLUG = "gender-equality-plan-2026";

export const GENDER_EQUALITY_CAMPAIGN_TITLE =
  "（仮称）世田谷区第三次男女共同参画プラン（素案）の意見募集";

export const GENDER_EQUALITY_PLAN =
  "（仮称）世田谷区第三次男女共同参画プラン（素案）";

export const GENDER_EQUALITY_SUBMISSION_DEADLINE = "2026-10-06T23:59:59+09:00";

export const GENDER_EQUALITY_OFFICIAL_SUBMISSION_URL =
  "https://www.city.setagaya.lg.jp/pub-comment/02409/34029.html";

export const GENDER_EQUALITY_OFFICIAL_INFORMATION_URL =
  "https://www.city.setagaya.lg.jp/02409/34851.html";

export const GENDER_EQUALITY_DV_SUPPORT_URL =
  "https://www.city.setagaya.lg.jp/02409/1025.html";

export const GENDER_EQUALITY_SOURCES = [
  {
    id: "public-comment-page",
    kind: "official",
    title: "世田谷区：第三次男女共同参画プラン素案への意見募集",
    url: GENDER_EQUALITY_OFFICIAL_INFORMATION_URL,
    description: "提出期限、提出できる方、提出方法を確認できます。",
  },
  {
    id: "draft-summary",
    kind: "official",
    title: "世田谷区第三次男女共同参画プラン素案（概要版）",
    url: "https://www.city.setagaya.lg.jp/documents/34851/publiccomment-gaiyouban.pdf",
    description: "計画の理念、施策体系、成果指標、推進体制を概観できます。",
  },
  {
    id: "draft-full",
    kind: "official",
    title: "世田谷区第三次男女共同参画プラン素案（本編）",
    url: "https://www.city.setagaya.lg.jp/documents/34851/publiccomment-honpen.pdf",
    description:
      "策定の背景、現状、個別事業、指標、重点事業、進行管理を確認できます。",
  },
  {
    id: "ordinance",
    kind: "official",
    title: "世田谷区多様性を認め合い男女共同参画と多文化共生を推進する条例",
    url: "https://www.city.setagaya.lg.jp/02409/1053.html",
    description:
      "計画の基礎となる基本理念、区・区民・事業者の役割を確認できます。",
  },
  {
    id: "current-plan",
    kind: "official",
    title: "世田谷区第二次男女共同参画プラン後期計画",
    url: "https://www.city.setagaya.lg.jp/02409/1095.html",
    description: "今回の素案に先行する現行計画と取組を確認できます。",
  },
  {
    id: "women-support-policy",
    kind: "official",
    title: "困難な問題を抱える女性への支援に関する基本的な方針",
    url: "https://www.city.setagaya.lg.jp/documents/24377/kihontekinahoshin.pdf",
    description:
      "本人の意思を尊重した支援、相談、居場所、生活再建、官民連携の方針を確認できます。",
  },
  {
    id: "dv-support",
    kind: "official",
    title: "世田谷区：DVに関する相談窓口一覧",
    url: GENDER_EQUALITY_DV_SUPPORT_URL,
    description: "区や関係機関の現在の相談窓口を確認できます。",
  },
] as const;

export type GenderEqualitySource = (typeof GENDER_EQUALITY_SOURCES)[number];

export const GENDER_EQUALITY_CONTEXT = `
このAIインタビューは、世田谷区が意見を募集している「${GENDER_EQUALITY_PLAN}」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月6日です。計画期間は2027年度から2031年度までの5年間で、現在は素案の段階です。

## 学習画面と共通の参照情報（確認日：${GENDER_EQUALITY_LEARNING_REVIEWED_AT}）
${GENDER_EQUALITY_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label ? `${section.label}: ` : ""}${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

## 説明上の重要な区別
- 今回は新しい条例案ではなく、2018年施行の条例や第二次男女共同参画プラン等に基づく取組を引き継ぎ、2027〜2031年度の施策をまとめる計画素案です。
- 計画は、女性が直面する格差や困難への支援を含みますが、女性だけを対象とするものではありません。男性の働き方、性の多様性、身体の健康、区民・事業者・行政の取組も扱います。
- 女性への重点支援と、男性、子ども、性的マイノリティなど多様な被害者を支援する入口を混同せず、どちらか一方を否定する説明をしないでください。
- DV等の被害者支援は、予防・啓発や相談だけでなく、安全確保、生活再建、関係機関との連携を扱います。ただし、素案に施策の方向が書かれていることと、個別の支援を受けられる条件・手順が全て決まっていることを混同しないでください。
- 「性と生殖に関する健康・権利」は、必要な知識や支援を得て、自分の身体や妊娠・出産について意思決定できることを含みます。特定の選択を勧める考え方ではありません。
- 「ジェンダー主流化」は、男女共同参画の担当課だけでなく、さまざまな部署が施策の企画・実施・見直しにジェンダー平等の視点を取り入れる考え方です。女性向け事業だけを増やすことと説明しないでください。
- 区の審議会等における女性委員割合の目標は、2026年度の35.0％から2031年度の40.0％です。区職員の「管理監督的立場」全体の女性割合と、「管理職」の女性割合は別の指標です。
- 素案は、実施状況や指標を年1回報告し、検証・評価を改善に反映する方針です。一方、素案公表時点で調整中の数値や、講座参加・認知度を中心とする指標もあります。評価の仕組みが全くないと説明せず、何を追加して確認してほしいかを整理してください。
- 計画には新規の取組だけでなく、既存事業の継続・充実も含まれます。素案に掲載された全ての事業を新設事業として説明しないでください。
`.trim();

export const GENDER_EQUALITY_QUESTIONS = [
  {
    id: "relationship",
    topic: "このプランと、あなたの暮らしとの関わり",
    question:
      "今回のプランは、性別等にかかわらず、自分の意思で生き方を選び、仕事・家庭・地域などに参加できる社会を目指すものです。\n\nあなたは、どのような立場や関心から、このプランに意見を伝えたいですか？\n\nご自身の暮らし、家族や身近な人のこと、仕事や地域活動を通じた関心など、話しやすいところから教えてください。性別や性的指向、被害経験など、話したくない個人情報を明かす必要はありません。",
    quickReplies: [
      "暮らしや家族との関わりから",
      "仕事・学校・地域活動との関わりから",
      "支援や相談に関わる立場から",
      "制度や地域社会への関心から",
    ],
    followUp:
      "性別、性的指向・性自認、被害経験、家族構成、学校名、勤務先、住所、個人名を尋ねない。話したくない個人情報を明かす必要がないことを尊重し、政策への関心に必要な範囲で整理する。",
  },
  {
    id: "priority",
    topic: "特に考えたい取組・論点",
    question:
      "素案では、仕事と育児・介護の両立、女性の就労や意思決定への参加、DV・性暴力・ハラスメントへの対応、困難を抱える女性への支援、性の多様性、性や身体の健康、区役所全体での取組などを扱っています。\n\nこの中で、特に意見を伝えたいことはどれですか？\n\n大切だと思う点、疑問や懸念がある点、素案では十分に取り上げられていないと感じることでも構いません。",
    quickReplies: [
      "仕事・育児・介護・意思決定への参加",
      "暴力・ハラスメントの防止と支援",
      "性の多様性・身体の健康と権利",
      "区役所全体の取組・目標・評価",
    ],
    followUp:
      "選ばれた論点を中心にする。列挙した項目以外の論点も受け入れ、計画全体への賛成・反対を先に決めさせない。",
  },
  {
    id: "experience",
    topic: "経験や身近な場面から見えること",
    question:
      "いま挙げていただいた点について、働き方や家庭内の役割分担、学校・職場での対応、相談や支援の利用などで、助けになったことや困ったことはありますか？ どのような対応や仕組みが、ご自身や身近な人の選択に関わっていたと感じますか？\n\n経験がなくても、今後への不安や期待を教えてください。個人や場所が分かる情報、被害の詳しい説明は不要です。",
    quickReplies: [
      "役立った対応や仕組みがある",
      "選択を難しくした制度や慣行がある",
      "相談や支援を利用しにくかった",
      "経験ではなく今後への期待を話したい",
    ],
    followUp:
      "被害、差別、健康、妊娠・出産等の詳しい経験を求めない。個人や場所が分かる情報を繰り返さず、制度・対応・慣行への評価として一般化する。",
  },
  {
    id: "assessment",
    topic: "区の目的や取組に、納得できる点・疑問がある点",
    question:
      "区は、性別等にかかわらず自分らしい生き方を選べることを目指し、区民・企業への働きかけ、相談や生活支援に加え、区役所のさまざまな部署の施策にも男女共同参画の視点を取り入れようとしています。\n\nこの目的や、あなたが注目している取組について、納得できる点と、疑問がある点・説明や対応が不十分だと感じる点はありますか？\n\nそう考える理由も、分かる範囲で教えてください。どちらか一方だけでも構いません。",
    quickReplies: [
      "納得できる点から話す",
      "疑問・不十分だと思う点から話す",
      "納得できる点と疑問の両方がある",
      "判断に必要な説明が足りない",
    ],
    followUp:
      "納得できる点と疑問点の両方を無理に挙げさせない。ユーザーが選んだ論点に沿い、素案に書かれた目的・取組への評価と、判断に必要な追加説明を区別する。",
  },
  {
    id: "evaluation",
    topic: "実施に必要な条件と、成果の確かめ方",
    question:
      "素案では、講座への参加や理解度、相談窓口の認知度などを成果指標に含め、取組の進み具合や目標の達成状況を毎年報告する方針です。\n\nあなたが注目する取組を進めるうえで、どのような体制や配慮が必要で、何を確認すれば効果や問題点が分かると思いますか？\n\n例えば、相談の利用しやすさ、プライバシーへの配慮、支援を受けた後の暮らし、職場や地域での対応の変化など、重視する点を教えてください。",
    quickReplies: [
      "相談や支援の利用しやすさ",
      "プライバシーと安全への配慮",
      "支援後の暮らしや選択の変化",
      "職場・地域・行政の対応の変化",
    ],
    followUp:
      "活動量、認知・理解、支援への到達、生活・組織の変化を区別する。AIから指標や数値目標を押しつけず、ユーザーが重視する実施条件と確認方法を整理する。",
  },
  {
    id: "proposal",
    topic: "計画の記載や、実際の進め方への具体的な要望",
    question:
      "ここまでのお話を踏まえて、今回のプランのどの取組について、何を、どのように変えてほしいですか？\n\n支援の対象や利用条件、相談の方法、学校・企業への働きかけ、区の担当部署の役割、実施時期や目標の置き方など、具体化できる範囲で教えてください。取組の追加・拡充だけでなく、進め方の見直しや、変更せずに続けてほしい内容でも構いません。",
    quickReplies: [
      "支援の対象・条件・相談方法",
      "学校・企業・地域への働きかけ",
      "担当部署・連携・実施時期",
      "目標・評価・継続してほしい取組",
    ],
    followUp:
      "ユーザーの価値判断を保ち、計画本文、年度ごとの実施、人員・予算、運用手順、評価・公表のどの層への提案かを整理する。AIから新しい数値目標や要求を追加しない。",
  },
  {
    id: "final",
    topic: "区に最も伝えたいこと",
    question:
      "今回の第三次男女共同参画プランについて、区に最も伝えたいことを、一つの要望やメッセージにまとめると、どのような内容になりますか？\n\nこれまで話した内容から、誰のどのような状況について、区に何をしてほしいのかを、短く表してください。うまく一文にまとまらなくても構いません。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。センシティブな属性や被害経験の詳細を最終意見として求めない。下書きへ進めるための最終確認とする。",
  },
] as const;

export type GenderEqualityQuestion = (typeof GENDER_EQUALITY_QUESTIONS)[number];
