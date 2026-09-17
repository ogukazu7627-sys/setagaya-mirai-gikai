import {
  RETAINING_WALL_LEARNING_REVIEWED_AT,
  RETAINING_WALL_LESSONS,
} from "./learning";

export const RETAINING_WALL_CAMPAIGN_SLUG = "retaining-wall-policy-2026";

export const RETAINING_WALL_CAMPAIGN_TITLE =
  "世田谷区がけ・擁壁等防災対策方針（素案）に関する区民意見募集";

export const RETAINING_WALL_POLICY = "世田谷区がけ・擁壁等防災対策方針（素案）";

export const RETAINING_WALL_SUBMISSION_DEADLINE = "2026-10-06T23:59:59+09:00";

export const RETAINING_WALL_OFFICIAL_SUBMISSION_URL =
  "https://www.city.setagaya.lg.jp/pub-comment/02039/33965.html";

export const RETAINING_WALL_OFFICIAL_INFORMATION_URL =
  "https://www.city.setagaya.lg.jp/02039/34282.html";

export const RETAINING_WALL_MAINTENANCE_URL =
  "https://www.city.setagaya.lg.jp/02039/636.html";

export const RETAINING_WALL_CONSULTATION_URL =
  "https://www.city.setagaya.lg.jp/02039/15829.html";

export const RETAINING_WALL_SOURCES = [
  {
    id: "public-comment-page",
    kind: "official",
    title: "世田谷区：がけ・擁壁等防災対策方針素案への意見募集",
    url: RETAINING_WALL_OFFICIAL_INFORMATION_URL,
    description: "提出期限、提出できる方、提出方法を確認できます。",
  },
  {
    id: "draft-full",
    kind: "official",
    title: "がけ・擁壁等防災対策方針（素案）本編",
    url: "https://www.city.setagaya.lg.jp/documents/34282/honpen.pdf",
    description: "現地調査、現行施策の評価、新たな施策の方向性を確認できます。",
  },
  {
    id: "overview",
    kind: "official",
    title: "がけ・擁壁等防災対策方針（素案）概要版",
    url: "https://www.city.setagaya.lg.jp/documents/34282/gaiyou.pdf",
    description: "調査結果、現行施策の課題、支援拡充の方向を概観できます。",
  },
  {
    id: "current-policy",
    kind: "official",
    title: "現行の世田谷区がけ・擁壁等防災対策方針",
    url: "https://www.city.setagaya.lg.jp/02039/675.html",
    description: "2016年に策定された現行方針とその位置づけを確認できます。",
  },
  {
    id: "current-subsidy",
    kind: "official",
    title: "公道に面した擁壁改修等工事の現行補助制度",
    url: "https://www.city.setagaya.lg.jp/02039/618.html",
    description: "現在の補助対象、補助率、上限額などの要件を確認できます。",
  },
  {
    id: "expert-dispatch",
    kind: "official",
    title: "擁壁改修専門家派遣制度",
    url: "https://www.city.setagaya.lg.jp/02039/619.html",
    description:
      "造り替え等を検討する際の構造や概算工事費の提案制度を確認できます。",
  },
  {
    id: "free-consultation",
    kind: "official",
    title: "宅地防災の専門家によるがけ・擁壁の無料相談会",
    url: RETAINING_WALL_CONSULTATION_URL,
    description: "擁壁等の不安や対策を専門家に相談できる現行制度です。",
  },
  {
    id: "maintenance",
    kind: "official",
    title: "擁壁や斜面（がけ）の適切な維持管理",
    url: RETAINING_WALL_MAINTENANCE_URL,
    description:
      "所有者の維持管理と、ひび割れ・ふくらみ・排水などの点検例を確認できます。",
  },
  {
    id: "mlit-manual",
    kind: "official",
    title: "国土交通省：宅地擁壁の健全度判定・予防保全対策マニュアル",
    url: "https://www.mlit.go.jp/toshi/toshi_tobou_tk_000069.html",
    description:
      "健全度判定や現地状況に応じた補修・再構築・補強の考え方を確認できます。",
  },
] as const;

export type RetainingWallSource = (typeof RETAINING_WALL_SOURCES)[number];

export const RETAINING_WALL_CONTEXT = `
このAIインタビューは、世田谷区が意見を募集している「${RETAINING_WALL_POLICY}」へのパブリックコメント作成を支援するものです。

募集期限は2026年10月6日です。区は2027年4月の方針改定を予定していますが、新たな補助制度などは現時点で成立・適用済みではありません。

## 学習画面と共通の参照情報（確認日：${RETAINING_WALL_LEARNING_REVIEWED_AT}）
${RETAINING_WALL_LESSONS.map((lesson) => `### ${lesson.title}\n${lesson.sections.map((section) => `${section.label ? `${section.label}: ` : ""}${section.body}\n出典ID: ${section.sourceRefs.join(", ")}`).join("\n\n")}`).join("\n\n")}

## 説明上の重要な区別
- 今回の募集は新しい条例案ではなく、2016年に策定した防災対策方針の改定素案です。方針の改定、法令上の規制、補助要綱、予算を混同しないでください。
- 民有地のがけ・擁壁は所有者による維持管理が基本です。区は、普及啓発、相談、専門家派遣、工事費補助などで安全対策を支える方向を示しています。民有地をすべて区が管理する方針ではありません。
- 現行の擁壁改修等補助は、一定要件の公道沿いの築造・再構築に対して対象経費の3分の1、上限300万円で、補強・補修は対象外です。素案は、補助額・割合の見直し、公共施設沿いへの拡充、補強工事の追加、特別警戒区域の解除に寄与する工事への新設補助を示しています。
- 素案には、見直し後の具体的な補助率・上限額、全ての対象要件、成果指標までは示されていません。方針素案の方向性と、今後要綱・予算・運用で具体化する事項を区別してください。
- 「擁壁405件の約3割が健全度『中・低』」は、道路・公園沿いや土砂災害警戒区域内などの今回調査した対象についての結果です。区内の全住宅や全擁壁の割合、直ちに崩壊する割合と説明しないでください。
- 「法令等に認められない種類」という調査上の分類は、個々の擁壁が違法と確定したことを意味しません。
- 現行の擁壁改修専門家派遣は、造り替え等の構造や概算工事費を提案する制度で、既存擁壁の安全性を判定する制度とは異なります。
- この意見募集は方針素案への意見提出であり、個別工事の補助金申請や安全診断の手続きではありません。
`.trim();

export const RETAINING_WALL_QUESTIONS = [
  {
    id: "relationship",
    topic: "このテーマとの関わり",
    question:
      "がけや擁壁（土砂が崩れるのを防ぐ壁）について、所有・管理する立場、近くに住む立場、通学・通勤などでそばを通る立場など、あなたにはどのような関わりがありますか。直接の関わりがなくても、地域の防災や行政の支援に関心を持ったきっかけから教えてください。具体的な住所や個人名は、この聞き取りでは不要です。",
    quickReplies: [
      "所有・管理する立場",
      "近くに住む立場",
      "通学・通勤などでそばを通る立場",
      "直接の関わりはないが関心がある",
    ],
    followUp:
      "直接の関わりの有無を問わない。正確な住所、地番、施設名、所有者名、個人名、連絡先、現地写真を求めない。所有関係や近隣トラブルの詳細を聞き出さず、政策への関心に必要な範囲で整理する。",
  },
  {
    id: "priority",
    topic: "素案の中で、特に考えたいこと",
    question:
      "今回の素案では、工事費補助の見直し、公共施設沿いへの補助対象の拡大、擁壁を造り替えるだけでなく補強する工事への支援が示されています。また、危険な区域の周知や避難への備えも扱っています。こうした内容のうち、あなたが特に気になっているのはどの点ですか。ここに挙げていないことでも構いません。",
    quickReplies: [
      "工事費補助の見直し",
      "公共施設沿いへの対象拡大",
      "補強工事への支援",
      "危険な区域の周知・避難への備え",
    ],
    followUp:
      "列挙した項目から選ぶことを強制せず、その他の論点も受け入れる。選ばれた論点を中心にし、方針全体への賛否を先に決めさせない。",
  },
  {
    id: "experience",
    topic: "経験や不安から、具体的な課題を聞く",
    question:
      "いま挙げていただいた点について、これまでの経験や不安、期待していることを教えてください。例えば、身近ながけ・擁壁の安全性が分からなかったこと、点検や工事を考える中で困ったこと、相談や情報提供が役立ったことなどはありますか。直接の経験がない場合は、どのような場面が心配なのか、どうなれば安心できそうかを教えてください。",
    quickReplies: [
      "安全性が分からず不安だった",
      "点検や工事を考える中で困った",
      "相談や情報提供が役立った",
      "直接の経験はないが心配がある",
    ],
    followUp:
      "直接の経験がない回答も受け入れる。場所や当事者が特定できる詳細を求めない。個別の擁壁の安全性、工法、費用、法令適合を判定せず、経験、不安、期待、提案を区別する。",
  },
  {
    id: "prioritization",
    topic: "区の目的や対策内容への納得と、まだ不十分だと思う点",
    question:
      "区は、所有者による維持管理を基本としながら、相談や工事費への支援を通じて、崩壊する前に危険を減らす対策を進めようとしています。この目的や、補助対象・工事の選択肢を広げる内容について、納得できる点と、まだ不十分だと思う点はありますか。どちらか一方だけでも、判断するために説明してほしいことでも構いません。",
    quickReplies: [
      "予防保全の目的に納得できる",
      "補助対象・工事の選択肢の拡大に納得できる",
      "支援の内容にまだ不十分な点がある",
      "判断のために説明がほしい",
    ],
    followUp:
      "納得できる点と不十分な点の両方を必須にしない。賛成・反対を迫らず、判断に必要な説明を求める意見も受け入れる。方針の目的、対象、工事の選択肢、費用分担など、ユーザーが重視する点を具体化する。",
  },
  {
    id: "implementation",
    topic: "対策の安全性を、どう確かめるか",
    question:
      "素案では、既存の擁壁を補強する工事も支援対象に加える考えが示されています。また、区は擁壁の定期的な点検や維持管理も呼びかけています。こうした対策で安全性が高まったか、その後も維持されているかを確かめるために、どのような確認や仕組みが必要だと思いますか。工事前後の専門家による確認、その後の点検、所有者や近隣住民への結果の伝え方など、重視することを教えてください。",
    quickReplies: [
      "工事前後に専門家が確認する",
      "定期点検と記録を続ける",
      "結果を所有者・近隣住民へ伝える",
      "区が実施状況と効果を検証する",
    ],
    followUp:
      "個別案件の安全性、工法、工事の要否を判定しない。誰が、いつ、どの方法で確認し、記録・結果をどう共有するかという制度への意見を整理する。近隣への共有を当然の義務と断定しない。",
  },
  {
    id: "proposal",
    topic: "方針や制度の運用を、具体的にどうしてほしいか",
    question:
      "ここまでのお話を踏まえて、区の方針や制度の運用について、どの部分をどう変えてほしいですか。例えば、補助対象や自己負担の考え方、相談から工事までの支援、道路に面しない擁壁への対応、対策が終わるまでの情報提供や避難への備えなどについて、具体的な希望を教えてください。変更ではなく、今の案で続けてほしい点でも構いません。",
    quickReplies: [
      "補助対象・自己負担の考え方",
      "相談から工事までの支援",
      "道路に面しない擁壁への対応",
      "情報提供・避難への備え",
    ],
    followUp:
      "変更要望だけでなく、今の案で続けてほしい点も受け入れる。ユーザーの価値判断を保ち、方針、要綱・予算、運用、検証のどの層への提案かを整理する。AIから新しい要求や数値目標を足さない。",
  },
  {
    id: "final",
    topic: "区に最も伝えたいこと",
    question:
      "今回のがけ・擁壁対策について、区に最も伝えたいことを一言で表すと何ですか。ここまで話した中で、特に大切にしてほしいことや、確認してほしいことを、あなたの言葉で教えてください。",
    quickReplies: [],
    followUp:
      "「一言」を厳密な文字数制限としない。言い換えを押しつけず、本人の言葉を尊重する。下書きへ進めるための最終確認とする。",
  },
] as const;

export type RetainingWallQuestion = (typeof RETAINING_WALL_QUESTIONS)[number];
