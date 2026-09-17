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
    topic: "この方針改定との関わり",
    question:
      "今回の素案は、民有地のがけ・擁壁について、所有者による維持管理を基本にしつつ、区が注意喚起、相談、補助制度を通じて予防保全を支える方針です。また、区有地の管理や避難対策も定めています。\n\nあなたは、どのような立場や関心から、この方針について意見を伝えたいですか？ 所有地や近隣の正確な住所など、個人や場所を特定できる情報を書く必要はありません。",
    quickReplies: [
      "がけ・擁壁の所有者として",
      "近隣に住む・通行する立場として",
      "建築・防災・施設に関わる立場として",
      "区民・事業者として",
    ],
    followUp:
      "正確な住所、地番、施設名、所有者名、連絡先、現地写真を求めない。所有関係や近隣トラブルの詳細を聞き出さず、政策への関心に必要な範囲で整理する。",
  },
  {
    id: "priority",
    topic: "素案の中で、特に考えたい論点",
    question:
      "素案は、がけ・擁壁の情報収集と注意喚起、相談と専門家派遣、補助額・補助率の見直し、公共施設沿いや補強工事への対象拡充を示しています。区有地の管理や避難への備えも継続します。\n\nこの中で、特に意見を伝えたいのはどの点ですか？",
    quickReplies: [
      "危険の把握・点検・注意喚起",
      "補助対象・補助額・費用分担",
      "工事が難しい土地への支援",
      "維持管理・区有地・避難対策",
    ],
    followUp:
      "選ばれた論点を中心にする。一度に複数の論点を聞かず、方針全体への賛否を先に決めさせない。",
  },
  {
    id: "experience",
    topic: "安全対策を助けたもの・難しくしたもの",
    question:
      "区の資料では、相談制度には一定の利用がある一方、工事費補助は制度創設以来、利用実績がないとされています。費用負担、施工スペース、相談先や業者選びなどが課題として挙げられています。\n\nいま挙げていただいた点について、安全対策を進める助けになったことや、反対に調査・相談・工事等を難しくしたことはありますか？ 経験ではなく、制度への希望でも構いません。",
    quickReplies: [
      "相談や専門家の助言が役立った",
      "費用や施工条件が障壁になった",
      "相談先・業者・手続きが分かりにくかった",
      "経験ではなく制度への希望を話したい",
    ],
    followUp:
      "場所や当事者が特定できる詳細を求めない。個別の擁壁の安全性、工法、費用、法令適合を判定せず、経験、見聞、評価、提案を区別する。",
  },
  {
    id: "prioritization",
    topic: "所有者の責任と、周囲の安全をどう両立するか",
    question:
      "民有地は所有者の維持管理が基本ですが、崩壊すれば隣家、道路、避難所などに影響する場合があります。素案は公道沿いに加えて公共施設沿いへの支援拡充を示す一方、道路に面しないがけ・擁壁も多くあると推計しています。\n\n公費で支える対象や優先順位は、危険度、周囲への影響、所有者の負担などをどう考慮して決めるのがよいと思いますか？",
    quickReplies: [
      "生命・身体への危険度を重視する",
      "道路・避難所・隣家への影響を重視する",
      "所有者の責任と負担能力の両方を考える",
      "判定基準と優先順位を公開する",
    ],
    followUp:
      "私有財産への公費支出を自動的に肯定または否定しない。対象、危険度、公共性、費用分担、説明可能性のうち、ユーザーが重視する基準を具体化する。",
  },
  {
    id: "implementation",
    topic: "相談から実際の対策へつなげる仕組み",
    question:
      "素案は、情報収集と注意喚起、無料相談会、専門家派遣、工事費補助を組み合わせる方向です。一方、安全性を知りたい段階、設計・見積もり、近隣や共有者との調整、資金調達、工事後の点検で、別々の課題が起こり得ます。\n\n気づきや相談を実際の安全対策につなげるため、「誰が・どの段階で・何を支えるか」について、区に特に明確にしてほしいことは何ですか？",
    quickReplies: [
      "相談・調査・診断の役割を分かりやすくする",
      "設計・業者選び・関係者調整を支える",
      "費用・施工スペースの制約に合う選択肢を用意する",
      "工事後の点検・維持管理・検証を続ける",
    ],
    followUp:
      "個別案件の工法や工事の要否を提案しない。相談、調査・診断、設計、業者選定、調整、資金、工事、継続管理のうち、政策として改善したい段階を整理する。",
  },
  {
    id: "proposal",
    topic: "方針の文言や、改定後の具体策への提案",
    question:
      "素案は支援拡充の方向を示していますが、見直し後の具体的な補助率・上限額、調査や再点検の頻度、年度ごとの優先順位、成果を確かめる指標までは定めていません。\n\nここまでのお話を踏まえ、「方針そのものに明記してほしいこと」や「補助要綱・予算・日々の運用で具体化してほしいこと」を、１〜３個挙げると何ですか？",
    quickReplies: [
      "対象と優先順位の基準を明確にする",
      "補助額・補助率・対象工事を具体化する",
      "相談から工事までの支援体制を整える",
      "実績と危険低減の効果を公表する",
    ],
    followUp:
      "ユーザーの価値判断を保ち、方針、要綱・予算、運用、検証のどの層への提案かを整理する。AIから新しい要求や数値目標を足さない。",
  },
  {
    id: "final",
    topic: "この方針改定について、区に最も伝えたいこと",
    question:
      "今回の方針改定によって、がけ・擁壁の崩壊を防ぐ取組や、所有者と周囲の人の安全が、どのようになってほしいですか？ ここまでのお話の中から、区に最も伝えたいことを、あなた自身の言葉で教えてください。これまでの質問では触れられなかったことでも構いません。",
    quickReplies: [],
    followUp:
      "言い換えを押しつけず、本人の言葉を尊重する。下書きへ進めるための最終確認とする。",
  },
] as const;

export type RetainingWallQuestion = (typeof RETAINING_WALL_QUESTIONS)[number];
