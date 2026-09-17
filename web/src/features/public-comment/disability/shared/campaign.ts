import {
  DISABILITY_LEARNING_REVIEWED_AT,
  DISABILITY_LESSONS,
} from "./learning";

export const DISABILITY_CAMPAIGN_SLUG = "disability-inclusion-amendment-2026";

export const DISABILITY_CAMPAIGN_TITLE =
  "世田谷区障害理解の促進と地域共生社会の実現をめざす条例の一部改正（素案）の意見募集";

export const DISABILITY_ORDINANCE =
  "世田谷区障害理解の促進と地域共生社会の実現をめざす条例の一部改正（素案）";

export const DISABILITY_SUBMISSION_DEADLINE = "2026-10-07T23:59:59+09:00";

export const DISABILITY_OFFICIAL_SUBMISSION_URL =
  "https://www.city.setagaya.lg.jp/pub-comment/02083/34044.html";

export const DISABILITY_OFFICIAL_INFORMATION_URL =
  "https://www.city.setagaya.lg.jp/02083/34329.html";

export const DISABILITY_DISCRIMINATION_CONSULTATION_URL =
  "https://www.city.setagaya.lg.jp/documents/2773/help_leaf.pdf";

export const DISABILITY_ABUSE_CONSULTATION_URL =
  "https://www.city.setagaya.lg.jp/02083/2709.html";

export const DISABILITY_SOURCES = [
  {
    id: "public-comment-page",
    kind: "official",
    title: "世田谷区：条例改正素案への意見募集",
    url: DISABILITY_OFFICIAL_INFORMATION_URL,
    description: "提出期限、提出できる方、提出方法を確認できます。",
  },
  {
    id: "draft-full",
    kind: "official",
    title: "条例改正素案（全文）",
    url: "https://www.city.setagaya.lg.jp/documents/34329/joureisoan.pdf",
    description: "改正の考え方と追加される条文を確認できます。",
  },
  {
    id: "easy-version",
    kind: "official",
    title: "条例改正素案（わかりやすい版）",
    url: "https://www.city.setagaya.lg.jp/documents/34329/wakariyasuiban.pdf",
    description:
      "地域生活、意思決定支援、区政参加の内容を平易な説明で確認できます。",
  },
  {
    id: "overview",
    kind: "official",
    title: "条例改正素案（概要版）",
    url: "https://www.city.setagaya.lg.jp/documents/34329/gaiyou.pdf",
    description: "改正の背景と3つの主要な改正点を確認できます。",
  },
  {
    id: "comparison",
    kind: "official",
    title: "条例新旧対照表",
    url: "https://www.city.setagaya.lg.jp/documents/34329/shinkyu.pdf",
    description: "現行条例と改正素案の文言の違いを確認できます。",
  },
  {
    id: "current-ordinance",
    kind: "official",
    title: "現行の障害理解・地域共生条例",
    url: "https://www.city.setagaya.lg.jp/documents/2857/zenbun.pdf",
    description:
      "社会モデル、差別の禁止、合理的配慮など、すでにある規定を確認できます。",
  },
  {
    id: "inclusion-plan",
    kind: "official",
    title: "せたがやインクルージョンプラン",
    url: "https://www.city.setagaya.lg.jp/02083/10824.html",
    description:
      "条例の理念を施策・事業として具体化する現在の計画を確認できます。",
  },
  {
    id: "mhlw-guideline",
    kind: "official",
    title:
      "厚生労働省：障害福祉サービス等の提供に係る意思決定支援ガイドライン（第2版）",
    url: "https://www.mhlw.go.jp/stf/newpage_76171.html",
    description:
      "本人の意思の形成・表明・実現を支える際の国の考え方を確認できます。",
  },
  {
    id: "concluding-observations",
    kind: "official",
    title: "外務省：国連障害者権利委員会の日本政府報告に関する総括所見",
    url: "https://www.mofa.go.jp/mofaj/files/100448721.pdf",
    description:
      "地域生活、意思決定、政策決定への参加などに関する勧告を確認できます。",
  },
] as const;

export type DisabilitySource = (typeof DISABILITY_SOURCES)[number];

export const DISABILITY_CONTEXT = `
このAIインタビューは、世田谷区が意見を募集している「${DISABILITY_ORDINANCE}」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月7日です。区は2027年4月1日の改正条例施行を目指していますが、現時点では改正内容は成立・施行済みではありません。

## 学習画面と共通の参照情報（確認日：${DISABILITY_LEARNING_REVIEWED_AT}）
${DISABILITY_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label ? `${section.label}: ` : ""}${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

## 説明上の重要な区別
- 素案に書かれている事項、現行条例ですでに定められている事項、現在の施策、ユーザーの経験・評価、ユーザーの提案を混同しないでください。
- 差別の禁止、合理的配慮、障害の社会モデルは現行条例にすでにあります。今回初めて導入されると説明しないでください。
- 今回の主要な追加は、本人が選んだ地域での暮らしに必要な施策、意思決定支援、政策づくりへの参加・参画の環境整備です。
- 地域生活の支援は、全員にひとり暮らしを求めるものでも、家族との同居やグループホームを否定するものでもありません。必要な支援を受けながら、本人が暮らし方を選ぶ考え方です。
- 意思決定支援は、家族や支援者が本人の代わりに結論を決めることではありません。本人に合う方法で、意思の形成・表明・実現を支えます。すぐに決めない、決定を先に延ばす、決めたことを変えるという本人の選択も尊重する考え方です。
- 第8条の3は、区民の参加を求めて開催する会議等で、障害のある人が特性に応じて参加・参画できる環境を整えるよう区が努める規定です。参加できることと、提案が必ず採用されることは同じではありません。
- 追加条文には「実施に努める」と「必要な施策を講ずる」があり、すべてが同じ規定の強さではありません。ただし、既存の合理的配慮の義務は維持されます。
- 素案本文には、住宅の確保戸数、支援者の配置人数、予算額、本人の希望が尊重されたかを検証する具体的方法までは示されていません。これらは計画・予算・運用で具体化を求められる論点であり、施策が存在しないと断定しないでください。
`.trim();

export const DISABILITY_QUESTIONS = [
  {
    id: "relationship",
    topic: "この条例改正のテーマとの関わり",
    question:
      "現行条例は、障害の社会モデルに立ち、差別の禁止や合理的配慮などを定めています。今回の改正素案は、これに加えて、本人が暮らし方を選ぶこと、意思決定支援を受けること、区の政策づくりに参加・参画することについて、区などの役割を具体化しています。\n\nあなたは、どのような立場や関心から、この改正について意見を伝えたいですか？ 話したくない個人情報や、障害・病気の詳しい内容を書く必要はありません。",
    quickReplies: [
      "本人として",
      "家族として",
      "支援・サービスに関わる立場として",
      "区民・事業者として",
    ],
    followUp:
      "診断名、障害者手帳、利用サービス、住所、勤務先、所属団体を尋ねない。本人という回答を幼いものとして扱わず、本人以外の回答も本人の意思を推測して断定しない。",
  },
  {
    id: "priority",
    topic: "改正素案の中で、特に考えたい論点",
    question:
      "改正素案は、本人が選んだ地域での暮らしを支える施策、区や障害福祉サービス事業者等による意思決定支援、区の政策づくりに参加・参画できる環境整備を追加します。一方、具体的な住宅数、人員、予算、検証方法までは条文で決めていません。\n\n今回の改正で、特に掘り下げたいのはどの部分ですか？",
    quickReplies: [
      "希望する地域生活を選べること",
      "本人の意思決定を支えること",
      "区政へ参加・参画できること",
      "実施体制や検証方法",
    ],
    followUp:
      "選ばれた論点を中心にする。他の選択肢もあると伝えられるが、一度に複数の問いを出さない。賛成・反対を先に決めさせない。",
  },
  {
    id: "experience",
    topic: "経験や実感から、その論点を掘り下げる",
    question:
      "素案は、本人の選択や意思を尊重し、必要な支援と参加方法を整える方向を示しています。ただし、条文に方針が書かれることと、日々の暮らしや会議で実際に選べることは同じとは限りません。\n\nいま挙げていただいた点について、話せる範囲で、助けになった支援や配慮、反対に選択や参加を難しくした障壁はありますか？ 経験ではなく、制度への希望を話しても構いません。",
    quickReplies: [
      "助けになった支援や配慮がある",
      "選べない・伝わらないと感じたことがある",
      "立場によって対応が違うと感じる",
      "経験ではなく制度への希望を話したい",
    ],
    followUp:
      "個別の医療・福祉情報や、つらい出来事の再説明を求めない。本人の経験、他者から見聞きしたこと、評価、制度への希望を必要に応じて区別する。",
  },
  {
    id: "decision-making",
    topic: "本人が決めるための支援を、実際にどう保障するか",
    question:
      "素案の意思決定支援は、支援者が代わりに決めるのではなく、本人に合う方法で説明し、希望を考え、伝え、実現できるよう支える考え方です。すぐに決めないことや、決めたことを変えることも含め、本人の自己決定を尊重することが基本です。\n\n本人と家族・支援者の考えが異なる場合や、意思を言葉だけでは伝えにくい場合も含め、本人の希望を尊重するために、どのようなルールや支援が必要だと思いますか？",
    quickReplies: [
      "本人に合う説明・意思疎通の方法",
      "考える時間と選び直す機会",
      "家族・支援者と意見が違う場合の手順",
      "第三者への相談や確認の仕組み",
    ],
    followUp:
      "特定の意思疎通方法を前提にしない。本人の返答の速さや言葉の有無から意思がないと判断しない。家族と支援者を一律に対立相手として扱わない。",
  },
  {
    id: "participation",
    topic: "区政への参加・参画を、形だけにしない仕組み",
    question:
      "素案は、区民の参加を求めて開く会議などで、障害のある人も参加・参画できる環境を整えるよう区に求めています。区は、手話通訳、要約筆記、音声ややさしい日本語の資料、オンライン参加などを例示しています。\n\n会議に出席できるだけでなく、内容を理解し、意見を伝え、その扱いについて説明を受けられるようにするため、会議の前・当日・終了後に何を保障してほしいですか？",
    quickReplies: [
      "事前に選べる参加・情報保障の方法",
      "理解しやすい資料と十分な検討時間",
      "発言・対話のための支援",
      "意見をどう扱ったかの説明",
    ],
    followUp:
      "参加できることと意見が必ず採用されることを混同しない。どの会議にも同じ手段が適するとは決めつけず、選べる方法と事前調整を具体化する。",
  },
  {
    id: "proposal",
    topic: "条例の文言や、施行後の計画・運用への具体的な提案",
    question:
      "改正素案は区や事業者等の役割を定め、具体的な住宅、支援体制、参加方法、予算、評価指標などは、計画・予算・事業の運用で具体化する構成です。\n\nここまでのお話を踏まえ、「条例そのものに明記してほしいこと」と「計画や日々の運用で具体化してほしいこと」「実施できたかを確かめる方法」を合わせて１〜３個挙げると、何ですか？",
    quickReplies: [
      "条例の文言を明確にする",
      "計画・予算・事業で具体化する",
      "本人が選べる相談・支援体制を整える",
      "本人参加で検証し結果を公表する",
    ],
    followUp:
      "本人の価値判断を保ち、条例、計画・予算、運用、検証のどの層への提案かを整理する。AIから新しい要求や数値目標を足さない。",
  },
  {
    id: "final",
    topic: "この条例改正について、区に最も伝えたいこと",
    question:
      "今回の条例改正によって、障害のある人の日々の暮らしや選択、区政への参加が、どのように変わってほしいですか？ ここまでのお話の中から、区に最も伝えたいことを、あなた自身の言葉で教えてください。これまでの質問では触れられなかったことでも構いません。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。下書きへ進めるための最終確認とする。",
  },
] as const;

export type DisabilityQuestion = (typeof DISABILITY_QUESTIONS)[number];
