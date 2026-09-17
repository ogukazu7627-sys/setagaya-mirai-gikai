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
    topic: "この改正との関わり",
    question:
      "今回の改正は、障害のある人の「地域での暮らし方の選択」「意思決定の支援」「区政への参加・参画」について、区などの役割を書き加えるものです。\n\nあなたは、どのような立場や関心から、この改正について意見を伝えたいですか？",
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
    topic: "今回の改正で、特に考えたい論点",
    question:
      "素案では、ひとり暮らし・家族との同居・グループホームなど、本人が選んだ生活を区が支えること、区や福祉サービス事業者等が本人の意思決定を支えること、区の政策づくりの会議に参加できる環境を整えることを定めています。\n\nこの中で、特に意見を伝えたいのは、どの点ですか？",
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
    topic: "暮らしの選択や参加を、支えたもの・難しくしたもの",
    question:
      "いま挙げていただいた点について、住まいを選ぶ、福祉サービスの利用を決める、区の会議で意見を伝えるといった場面で、助けになった支援や配慮、反対に選択や参加を難しくしたことはありますか？",
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
    topic: "本人が決めるための支援を、どう行うか",
    question:
      "素案の第８条の２では、区と福祉サービス事業者等が、本人の意思を生活に反映させるための支援に努めることを定めています。また、第15条の２では、本人がその支援を受けられるよう、区が事業者等に必要な施策を行うとしています。\n\nこの支援を行う際、本人と家族・支援者の考えが異なる場合や、意思を言葉だけでは伝えにくい場合に、本人の希望をどう確かめ、生活に反映していくべきだと思いますか？",
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
    topic: "条文を、実際に利用できる仕組みにつなげるには",
    question:
      "素案は、本人が選んだ地域生活や意思決定支援のために、区が必要な施策を行うと定めています。一方、意思決定支援の実施や区政参加の環境整備には、「努める」という書き方をしています。\n\nこうした規定を現場で実際に機能させるため、区にどのような仕組みを明確にしてほしいですか？",
    quickReplies: [
      "相談先や担当者を明確にする",
      "実施期限や対応手順を決める",
      "必要な人員や予算を確保する",
      "本人参加で実施状況を検証する",
    ],
    followUp:
      "仕組みの例を押しつけず、担当、期限、相談、予算、人員、検証などのうち、ユーザーが重視する点を具体化する。努力義務だから実施しなくてよいと断定しない。",
  },
  {
    id: "proposal",
    topic: "条例の文言や、施行後の具体策への提案",
    question:
      "今回の条例改正は、障害施策を具体化する「次期せたがやインクルージョンプラン」の策定と並行して進められています。\n\nここまでのお話を踏まえて、「条例に明記してほしいこと」や「施行後の計画・運用で具体化してほしいこと」を、１〜３個挙げると何ですか？",
    quickReplies: [
      "条例の文言を明確にする",
      "次期計画で具体策を定める",
      "本人が選べる相談・支援体制を整える",
      "本人参加で検証し結果を公表する",
    ],
    followUp:
      "本人の価値判断を保ち、条例、計画・予算、運用、検証のどの層への提案かを整理する。AIから新しい要求や数値目標を足さない。",
  },
  {
    id: "final",
    topic: "今回の改正について、最も伝えたいこと",
    question:
      "今回の改正について、区へ最も伝えたいことは何ですか？ 改正によって実現してほしい暮らしや参加のあり方、大切にしてほしい考え方、懸念していることなど、ここまでのお話の中で、提出する意見に必ず残したいことを、あなたの言葉で教えてください。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。下書きへ進めるための最終確認とする。",
  },
] as const;

export type DisabilityQuestion = (typeof DISABILITY_QUESTIONS)[number];
