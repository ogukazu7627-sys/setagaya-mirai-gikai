export const TRAFFIC_SAFETY_PLAN_LEARNING_REVIEWED_AT = "2026-09-18";
export const TRAFFIC_SAFETY_PLAN_LEARNING_ESTIMATED_TIME = "7〜10分";

export const TRAFFIC_SAFETY_PLAN_LESSONS = [
  {
    id: "plan-purpose",
    title: "第１章｜この計画で、何を目指しているの？",
    sections: [
      {
        label: "",
        body: "世田谷区は、1971年以降、交通安全計画を繰り返し策定してきました。今回の計画は、2026～2030年度の５年間に、区や警察などが連携して進める交通安全対策の方針です。区独自の罰則を新たに設ける条例ではありません。",
        sourceRefs: ["draft-summary", "draft-full", "current-plan"],
      },
      {
        label: "",
        body: "素案は、2030年度までの削減目標として、交通事故の死者数０人、負傷者数1,650人以下を掲げています。そのために、交通安全教育、道路環境の整備、交通違反への取締りなどを組み合わせる内容です。これは達成済みの実績ではなく、これから目指す目標です。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question: "この計画の位置づけとして、正しいものはどれでしょう？",
      options: [
        "A．区独自の交通違反と罰則を新設する条例",
        "B．区や警察などが連携して取り組む、５年間の交通安全対策の方針",
        "C．個別の道路工事の日程だけを決める計画",
      ],
      correctIndex: 1,
      explanation:
        "交通安全を、道路整備だけ、取締りだけで進めるのではなく、関係機関が役割を分担して総合的に進める計画です。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "accident-data",
    title: "第２章｜世田谷区では、どんな事故が起きているの？",
    sections: [
      {
        label: "",
        body: "2025年１～12月の区内の交通事故は、1,619件、負傷者1,779人、死者６人でした。前年より事故件数と負傷者数は減りましたが、死者数は３人から６人に増えています。「事故の数」と「被害の大きさ」は、分けて見る必要があります。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "また、自転車が関係する事故は786件で、全体の48.5％、約半数です。ただし、「自転車が関係した」という意味であり、「自転車側が原因だった」という意味ではありません。この数字だけから、事故の責任がどちらにあったかは判断できません。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question: "「自転車関与事故が約半数」とは、どういう意味でしょう？",
      options: [
        "A．交通事故の約半数は、自転車側に原因がある",
        "B．交通事故の約半数は、自転車同士の衝突である",
        "C．交通事故の約半数に、自転車が当事者として含まれている",
      ],
      correctIndex: 2,
      explanation:
        "「関与」と「原因」は別です。なお、この786件という集計では、自転車同士の事故も重複させず、１件として数えています。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "children-and-elderly",
    title: "第３章｜子どもや高齢者が、安全に歩ける道をどうつくるの？",
    sections: [
      {
        label: "",
        body: "素案は、子どもや高齢者への安全教室に加え、通学路の合同点検、園児が歩く経路の安全対策、段差に配慮した歩道や信号機の整備を位置づけています。本人への注意喚起だけでなく、道路環境も改善する考え方です。",
        sourceRefs: ["draft-summary", "draft-full", "current-plan"],
      },
      {
        label: "",
        body: "関連する国の制度として、2026年９月１日から、中央線などがない一定の一般道路では、自動車の法定速度が原則30km/hになりました。ただし、すべての道路が対象ではなく、標識などで最高速度が指定されている場合は、その指定が優先します。",
        sourceRefs: ["draft-full", "national-speed-rule"],
      },
    ],
    quiz: {
      question:
        "子どもや高齢者の安全対策として、素案に含まれているのはどれでしょう？",
      options: [
        "A．安全教室と、通学路・歩道・信号機などの改善を組み合わせる",
        "B．安全教室に一本化し、道路環境の改善は対象にしない",
        "C．自動車を運転する人だけを対象とし、歩行者は対象にしない",
      ],
      correctIndex: 0,
      explanation:
        "通学路は学校や保護者、警察などが合同で点検します。歩行者の安全も、本人の行動と周囲の環境の両面から扱います。",
      sourceRefs: ["draft-summary", "draft-full", "current-plan"],
    },
  },
  {
    id: "bicycle-safety",
    title: "第４章｜自転車は、ルールと利用環境の両方を変えるの？",
    sections: [
      {
        label: "",
        body: "素案では、自転車の安全教育や指導・取締りと、走る場所・駐輪する場所の整備を並行して進めます。利用者にルールを知らせるだけでなく、安全に利用できる環境も整える内容です。",
        sourceRefs: ["draft-summary", "draft-full", "current-plan"],
      },
      {
        label: "",
        body: "また、2026年４月から、16歳以上の自転車運転者を対象に「青切符」の制度が導入されました。これは国の法律に基づく制度で、この区の計画が新設するものではありません。青切符の導入は、違反を新しく作ることではなく、対象となる違反を検挙した後の手続を変えるものです。",
        sourceRefs: ["draft-full", "bicycle-ticket-system"],
      },
    ],
    quiz: {
      question: "自転車の青切符について、正しい説明はどれでしょう？",
      options: [
        "A．世田谷区が独自に導入する制度である",
        "B．国の制度で、16歳以上の自転車運転者が対象となる",
        "C．年齢を問わず、すべての違反が青切符で処理される",
      ],
      correctIndex: 1,
      explanation:
        "すべての違反が青切符になるわけではありません。指導警告で対応する場合もあれば、飲酒運転など刑事手続で扱う違反もあります。",
      sourceRefs: ["draft-full", "bicycle-ticket-system"],
    },
  },
  {
    id: "small-mobility",
    title: "第５章｜電動キックボードなどには、どう対応するの？",
    sections: [
      {
        label: "",
        body: "今回、新しい重点課題として加わったのが、電動キックボードやペダル付き電動バイクなど「小型モビリティ」の安全対策です。販売・シェアサービスの事業者とも連携し、車両ごとに異なるルールの周知、多言語の教材の活用、危険な運転への指導・取締りを進めます。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "一方、従来からのバイク事故の防止と飲酒運転対策も継続します。運転者への教育や取締りに加え、飲酒運転については、運転者の周囲の人にも防止を呼びかける内容です。新しい乗り物への対応に、従来の対策を置き換えるわけではありません。",
        sourceRefs: ["draft-summary", "draft-full", "current-plan"],
      },
    ],
    quiz: {
      question: "今回、新たに重点課題へ加わったものはどれでしょう？",
      options: [
        "A．高齢者の交通安全",
        "B．飲酒運転の根絶",
        "C．小型モビリティの安全対策",
      ],
      correctIndex: 2,
      explanation:
        "高齢者や子ども、自転車、バイク、飲酒運転という従来の５課題に、小型モビリティを加えた６つの重点課題になっています。",
      sourceRefs: ["draft-summary", "draft-full", "current-plan"],
    },
  },
  {
    id: "implementation",
    title: "第６章｜誰が実行し、区民は何を確認できるの？",
    sections: [
      {
        label: "",
        body: "区は道路整備や全体の調整、警察は交通規制や取締り、消防は救助・救急などを担います。学校や事業者、地域も参加する仕組みです。事故を防ぐ対策だけでなく、事故後の救命や被害者の相談支援も含まれます。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "計画を読む際は、「何を行うか」という方針と、「どこで・いつ行うか」「結果をどう確かめるか」という実施上の情報を分けて確認できます。例えば、「通学路の点検後、改善状況をどう知らせるのか」は、具体的な確認事項になります。",
        sourceRefs: ["draft-full"],
      },
      {
        label: "",
        body: "素案への意見提出期限は2026年10月６日必着、意見の公表は2027年２月予定です。区内在住者に加え、在勤・在学者なども提出できます。",
        sourceRefs: ["public-comment-page"],
      },
    ],
    quiz: {
      question: "この計画の実行体制として、正しいものはどれでしょう？",
      options: [
        "A．区、警察、消防、学校、事業者などが役割を分担する",
        "B．交通規制や取締りを含め、すべて区が単独で実施する",
        "C．行政は方針だけを示し、実行はすべて区民に任せる",
      ],
      correctIndex: 0,
      explanation:
        "区民の安全行動も計画に含まれますが、それだけに任せる仕組みではありません。行政機関それぞれの権限と役割に応じて、対策を進める計画です。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
] as const;
