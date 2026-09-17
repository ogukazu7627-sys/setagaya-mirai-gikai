import {
  INCLUSION_PLAN_LEARNING_REVIEWED_AT,
  INCLUSION_PLAN_LESSONS,
} from "./learning";

export const INCLUSION_PLAN_CAMPAIGN_SLUG = "inclusion-plan-2026";

export const INCLUSION_PLAN_CAMPAIGN_TITLE =
  "次期せたがやインクルージョンプラン-世田谷区障害施策推進計画-（素案）の意見募集";

export const INCLUSION_PLAN_PLAN =
  "次期せたがやインクルージョンプラン-世田谷区障害施策推進計画-（素案）";

export const INCLUSION_PLAN_SUBMISSION_DEADLINE = "2026-10-07T23:59:59+09:00";

export const INCLUSION_PLAN_OFFICIAL_SUBMISSION_URL =
  "https://www.city.setagaya.lg.jp/pub-comment/02083/34043.html";

export const INCLUSION_PLAN_OFFICIAL_INFORMATION_URL =
  "https://www.city.setagaya.lg.jp/02083/34164.html";

export const INCLUSION_PLAN_DISCRIMINATION_CONSULTATION_URL =
  "https://www.city.setagaya.lg.jp/documents/2773/help_leaf.pdf";

export const INCLUSION_PLAN_ABUSE_CONSULTATION_URL =
  "https://www.city.setagaya.lg.jp/02083/2709.html";

export const INCLUSION_PLAN_SOURCES = [
  {
    id: "public-comment-page",
    kind: "official",
    title: "世田谷区：次期せたがやインクルージョンプラン素案への意見募集",
    url: INCLUSION_PLAN_OFFICIAL_INFORMATION_URL,
    description: "計画期間、提出期限、提出できる方、提出方法を確認できます。",
  },
  {
    id: "draft-summary",
    kind: "official",
    title: "次期せたがやインクルージョンプラン素案（概要版）",
    url: "https://www.city.setagaya.lg.jp/documents/34164/gaiyouban2.pdf",
    description: "計画の基本理念、重点的な取組み、施策体系を概観できます。",
  },
  {
    id: "draft-full",
    kind: "official",
    title: "次期せたがやインクルージョンプラン素案（全文）",
    url: "https://www.city.setagaya.lg.jp/documents/34164/honpen2.pdf",
    description:
      "計画の位置付け、個別施策、成果目標、推進体制、実態調査を確認できます。",
  },
  {
    id: "easy-version",
    kind: "official",
    title: "次期せたがやインクルージョンプラン素案（わかりやすい版）",
    url: "https://www.city.setagaya.lg.jp/documents/34164/wakariyasuiban.pdf",
    description: "計画の考え方と主な取組みを平易な説明で確認できます。",
  },
  {
    id: "current-plan",
    kind: "official",
    title: "せたがやインクルージョンプラン（令和6～8年度）",
    url: "https://www.city.setagaya.lg.jp/02083/10824.html",
    description: "今回の素案に先行する現行計画と取組みを確認できます。",
  },
  {
    id: "ordinance-amendment",
    kind: "official",
    title: "障害理解・地域共生条例の一部改正素案への意見募集",
    url: "https://www.city.setagaya.lg.jp/02083/34329.html",
    description:
      "本人が選んだ地域生活、意思決定支援、区政参加に関する並行した条例改正手続きを確認できます。",
  },
  {
    id: "current-ordinance",
    kind: "official",
    title: "現行の障害理解・地域共生条例",
    url: "https://www.city.setagaya.lg.jp/documents/2857/zenbun.pdf",
    description:
      "社会モデル、差別の禁止、合理的配慮、情報コミュニケーションなどの既存規定を確認できます。",
  },
  {
    id: "survey",
    kind: "official",
    title: "世田谷区障害者（児）実態調査",
    url: "https://www.city.setagaya.lg.jp/02083/2878.html",
    description: "次期計画の基礎となる本人・家族・事業者の調査を確認できます。",
  },
] as const;

export type InclusionPlanSource = (typeof INCLUSION_PLAN_SOURCES)[number];

export const INCLUSION_PLAN_CONTEXT = `
このAIインタビューは、世田谷区が意見を募集している「${INCLUSION_PLAN_PLAN}」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月7日です。計画期間は2027年度から2029年度までの3年間で、現在は素案の段階です。

## 学習画面と共通の参照情報（確認日：${INCLUSION_PLAN_LEARNING_REVIEWED_AT}）
${INCLUSION_PLAN_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label ? `${section.label}: ` : ""}${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

## 説明上の重要な区別
- 今回の素案は、障害施策全体の方針を示す障害者計画、第8期障害福祉計画、第4期障害児福祉計画を一体化した2027〜2029年度の計画です。啓発や施設整備だけを扱う計画ではありません。
- 現行計画の取組み、今回の素案で継続・拡充する取組み、今後具体化・掲載する内容を混同しないでください。掲載された全ての事業を新規事業として説明しないでください。
- 「当事者の選択を支える」は、家族や専門職が本人に代わって一方的に決めることでも、全員に同じ暮らし方を求めることでもありません。分かりやすい情報、選択肢、体験、意思疎通、選び直しを支える考え方です。
- 地域生活支援拠点等は一つの建物だけを意味せず、相談、緊急時の受入れ・対応、体験の機会・場、専門的人材、地域の体制づくり等の機能を組み合わせる仕組みです。
- 高次脳機能障害施策の充実と多様な働き方の拡大は、新たな重点取組項目です。一方、関連する相談、就労、地域生活等の取組みが全て今回初めて始まると説明しないでください。
- 情報コミュニケーションは、情報を受け取ることだけでなく、本人が意思や希望を伝えることも含みます。デジタル手段だけに限定せず、障害特性等に応じた複数の方法を扱います。
- 素案110ページでは、区が定める障害福祉サービス等の成果目標、計画・活動指標、地域生活支援事業の計画が「今後掲載予定」です。国の目標が掲載されていることと、区の具体的な数値が確定していることを混同しないでください。
- 素案には、障害のある本人や協議会等の意見を踏まえた評価・検証と結果の公表が位置付けられています。評価の仕組みが全くないと説明せず、本人の暮らしの変化や支援への到達をどう確認するかという追加論点を整理してください。
- 並行して意見募集されている障害理解・地域共生条例の改正素案は、この計画と関連しますが別の手続きです。計画への意見と条例改正への意見を取り違えないでください。
`.trim();

export const INCLUSION_PLAN_QUESTIONS = [
  {
    id: "relationship",
    topic: "この計画との関わり",
    question:
      "この計画は、障害のある人の住まい、学び、仕事、情報、防災など、暮らしのさまざまな場面に関わるものです。\n\nあなたは、どのような立場や関心から、この計画について意見を伝えたいですか？\n\nご自身の暮らし、家族や身近な人への支援、仕事、地域での関わりなど、話しやすいところから教えてください。この対話で、障害や病気の詳しい内容、個人が分かる情報を伝える必要はありません。",
    quickReplies: [
      "自分の暮らしとの関わりから",
      "家族や身近な人への支援から",
      "仕事や地域での関わりから",
      "制度や地域社会への関心から",
    ],
    followUp:
      "診断名、障害者手帳、病歴、利用サービス、住所、勤務先、学校名、施設・事業所名、所属団体を尋ねない。本人という回答を幼いものとして扱わず、本人以外の回答も本人の意思を推測して断定しない。",
  },
  {
    id: "priority",
    topic: "特に考えたい取組みや論点",
    question:
      "素案では、希望する地域生活への支援、医療的ケア、精神障害・高次脳機能障害への支援、学びや多様な働き方、差別の解消、情報・防災、支援人材の確保などを扱っています。\n\nこの中で、あなたが特に話したいことは何ですか？\n\n続けてほしい取組み、改善してほしい取組み、計画では十分に扱われていないと感じることなど、どのような内容でも構いません。",
    quickReplies: [
      "地域生活・相談・家族支援",
      "学び・仕事・医療的ケア",
      "差別解消・情報・防災",
      "人材・目標・評価の仕組み",
    ],
    followUp:
      "選ばれた論点を中心にする。列挙された項目以外も受け入れ、計画全体への賛成・反対を先に決めさせない。複数の論点を一度に深掘りしない。",
  },
  {
    id: "experience",
    topic: "経験や期待から、具体的な課題を知る",
    question:
      "いま挙げていただいた点について、希望する暮らしや活動を後押しした支援、反対に、選択や参加を難しくした制度・環境はありますか？\n\n例えば、相談して必要なサービスにつながれたか、進学・卒業などで支援が途切れなかったか、必要な情報を利用できる方法で受け取れたか、といった場面です。経験したことや見聞きしたことを、話せる範囲で教えてください。具体的な経験ではなく、今後への不安や期待を話しても構いません。",
    quickReplies: [
      "後押しになった支援がある",
      "制度や環境が選択を難しくした",
      "支援の切れ目や情報に課題がある",
      "経験ではなく不安や期待を話したい",
    ],
    followUp:
      "個別の医療・福祉情報やつらい出来事の再説明を求めない。本人の経験、他者から見聞きしたこと、評価、今後への期待を必要に応じて区別する。個人や場所が分かる情報は一般化する。",
  },
  {
    id: "assessment",
    topic: "計画の目的や内容への納得と疑問",
    question:
      "区は『当事者の選択を支える』ことを計画の中心に置き、わかりやすい情報や体験の機会、複数の選択肢を用意し、本人の選択や選び直しを支える方針です。\n\nあなたが挙げたテーマについて、この目的や素案に書かれた取組みの内容で、納得できる点と、説明や対応がまだ不十分だと思う点はありますか？\n\nそう考える理由も教えてください。どちらか一方だけでも、判断するためにもっと知りたいことでも構いません。",
    quickReplies: [
      "納得できる点から話す",
      "不十分だと思う点から話す",
      "納得できる点と疑問の両方がある",
      "判断に必要な説明が足りない",
    ],
    followUp:
      "納得できる点と疑問点の両方を無理に挙げさせない。ユーザーが選んだテーマに沿い、計画の目的、取組みの方向、実施規模、判断に必要な追加説明を区別する。",
  },
  {
    id: "evaluation",
    topic: "支援が実際に役立ったことを、どう確かめるか",
    question:
      "区は、計画の実施状況を、障害のある本人や協議会などの意見も踏まえて評価し、結果を公表する方針です。\n\nあなたが挙げた取組みについて、何が実現すれば『必要な支援が届いた』『暮らしが変わった』といえるでしょうか？ また、それを区はどのように確認するとよいと思いますか？\n\n例えば、相談から利用までの待ち時間、希望する生活や活動を選べたか、本人への聞き取りなど、重視したい確認内容や方法を教えてください。",
    quickReplies: [
      "相談から利用までの待ち時間",
      "希望する暮らしや活動を選べたか",
      "支援が途切れず続いたか",
      "本人への聞き取りと結果の公表",
    ],
    followUp:
      "事業量、支援への到達、本人の選択、生活の変化、継続性を区別する。AIから数値目標を押しつけず、誰の声をどの方法で確認するかも含めてユーザーの重視点を整理する。",
  },
  {
    id: "proposal",
    topic: "計画や実施方法に、具体的に求めること",
    question:
      "素案では、区が定める成果目標や、障害福祉サービス等の計画・活動指標などは、今後掲載する予定となっています。\n\nここまでのお話を踏まえ、あなたが挙げたテーマについて、計画に具体的に書いてほしいことや、実施方法を変えてほしいことは何ですか？\n\n支援の対象・利用条件、相談先同士の連携、担い手の確保、実施時期など、気になる点から教えてください。今の取組みを続けてほしいという意見や、まず区に説明・確認してほしいことでも構いません。制度名や数値まで決める必要はありません。",
    quickReplies: [
      "対象・条件・相談方法を明確にする",
      "相談先や関係機関の連携を強める",
      "担い手・実施時期・提供量を示す",
      "継続してほしい取組みや説明を求める",
    ],
    followUp:
      "ユーザーの価値判断を保ち、計画本文、成果目標、年度ごとの実施、人員・予算、利用手順、評価・公表のどの層への提案かを整理する。制度名や数値をAIが新たに作らない。",
  },
  {
    id: "final",
    topic: "区に最も伝えたいことをまとめる",
    question:
      "ここまでのお話の中で、次期せたがやインクルージョンプランに関して、区に最も伝えたいことを、短い一文で表すと何ですか？\n\n『どのような暮らしや選択を大切にしたいか』『そのために区に何を求めるか』を、あなたの言葉で教えてください。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。センシティブな属性や障害・病気の詳細を最終意見として求めない。下書きへ進めるための最終確認とする。",
  },
] as const;

export type InclusionPlanQuestion = (typeof INCLUSION_PLAN_QUESTIONS)[number];
