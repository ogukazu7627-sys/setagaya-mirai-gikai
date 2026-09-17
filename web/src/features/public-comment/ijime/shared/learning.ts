export const IJIME_LEARNING_REVIEWED_AT = "2026-09-17";
export const IJIME_LEARNING_ESTIMATED_TIME = "7〜10分";

export const IJIME_LESSONS = [
  {
    id: "purpose-and-scope",
    title: "第１章　なぜ、新たな条例をつくるの？",
    sections: [
      {
        label: "",
        body: "世田谷区には、2014年から「いじめ防止基本方針」があり、予防や早期対応に取り組んできました。今回が、いじめ対策の出発点ではありません。",
        sourceRefs: ["setagaya-basic-policy"],
      },
      {
        label: "",
        body: "条例化の検討では、当初の重大事態の調査体制を整える議論から、予防、早期対応、被害からの回復、再発防止までを一体的に支える制度へと対象が広がりました。学校・教育委員会・区長部局が連携し、事実を調べるだけでなく、子どもが安心して学べる状態を取り戻すことまで支えようとしています。",
        sourceRefs: ["draft-full", "draft-overview", "special-edition"],
      },
    ],
    quiz: {
      question: "今回の条例化で、区が目指していることはどれでしょう？",
      options: [
        "A．重大な事件が起きたときの調査だけを行う",
        "B．予防から被害後の回復・再発防止まで、つながった対策を整える",
        "C．これまでの対策を廃止し、初めていじめへの対応を始める",
      ],
      correctIndex: 1,
      explanation:
        "既存の取組を踏まえ、事案の調査だけで終わらず、日常の予防からその後の支援までをつなげる考え方です。",
      sourceRefs: ["draft-full", "draft-overview", "setagaya-basic-policy"],
    },
  },
  {
    id: "definition",
    title: "第２章　子どもが「いじめられた」と言うまで待つの？",
    sections: [
      {
        label: "",
        body: "いじめは、暴力だけを指すものではありません。ネット上の行為も含まれ、行為をした側にいじめるつもりがなくても、受けた子どもが心身の苦痛を感じていれば、いじめに該当することがあります。",
        sourceRefs: ["draft-full", "setagaya-basic-policy"],
      },
      {
        label: "",
        body: "素案は、本人から明確な申告がなくても、学校が変化に気づいて対応することを定めています。表情や友人関係、学級の雰囲気などを教職員で共有し、いじめが疑われる場合は事実確認や支援につなげます。問題が起きる前から、安心して気持ちを話せる学級をつくることも重視しています。",
        sourceRefs: ["draft-full"],
      },
    ],
    quiz: {
      question:
        "本人から被害の申告がない場合、素案では学校にどのような対応を求めていますか？",
      options: [
        "A．変化や兆候を捉え、必要な確認や支援につなげる",
        "B．保護者から正式な申立てがあるまで待つ",
        "C．けがなど目に見える被害がなければ対応しない",
      ],
      correctIndex: 0,
      explanation:
        "自分から助けを求めにくい子どもも対象です。声を上げられた子どもだけでなく、声を上げにくい子どもにも気づこうとする仕組みです。",
      sourceRefs: ["draft-full"],
    },
  },
  {
    id: "voice-and-safety",
    title: "第３章　「関係の回復」は、必ず仲直りさせること？",
    sections: [
      {
        label: "",
        body: "素案は、被害を受けた子どもの安全・安心と尊厳の回復を最優先にしています。そのうえで、処罰自体を目的とするのではなく、関係する子どもの背景にも目を向け、状況の改善と再発防止につなげる方針です。",
        sourceRefs: ["draft-full", "draft-overview"],
      },
      {
        label: "",
        body: "対話や関係の調整も重視しますが、被害を受けた子どもだけに和解や関係の継続を求めるものではありません。本人の気持ちを聴き、周囲の環境も調整します。「元どおりの友人関係に戻すこと」と「安心を取り戻すこと」は、同じとは限りません。",
        sourceRefs: ["draft-full", "draft-overview"],
      },
    ],
    quiz: {
      question:
        "素案の「関係性の調整・回復」の考え方に合うものはどれでしょう？",
      options: [
        "A．被害を受けた子どもに、相手を許すよう求める",
        "B．双方が仲直りすることを、支援を受ける条件にする",
        "C．本人の意向を尊重し、被害が続かないよう環境も整える",
      ],
      correctIndex: 2,
      explanation:
        "関係の回復は、被害を受けた子どもに和解を押しつけるためのものではありません。本人の意向と安全を踏まえた対応が前提です。",
      sourceRefs: ["draft-full", "draft-overview"],
    },
  },
  {
    id: "prevention-and-response",
    title: "第４章　対応するのは、担任の先生だけ？",
    sections: [
      {
        label: "",
        body: "素案は、特定の先生だけに任せず、学校が組織として対応することを定めています。教育委員会は、心理職などの専門家による支援や相談体制を整え、学校や教職員が対応を抱え込まないよう支えます。区には、必要な財政措置を講じることも位置付けています。",
        sourceRefs: ["draft-full"],
      },
      {
        label: "",
        body: "家庭や地域にも、学校・関係機関と連携して子どもを支える役割があります。ただし、連携を掲げることと、実際に十分な支援が届くことは別です。人員配置や相談の流れは、具体的な運用を確認する際の項目になります。",
        sourceRefs: ["draft-full", "draft-overview"],
      },
    ],
    quiz: {
      question: "素案が想定する対応体制はどれでしょう？",
      options: [
        "A．担任が一人で判断し、解決まで担当する",
        "B．学校が組織で対応し、教育委員会や専門家などが支える",
        "C．学校は介入せず、保護者同士の話し合いに任せる",
      ],
      correctIndex: 1,
      explanation:
        "学校に対応を求めるだけでなく、教育委員会が学校を支える責任も定めています。ただし、具体的な配置人数や予算額まで、素案で決まっているわけではありません。",
      sourceRefs: ["draft-full", "draft-overview"],
    },
  },
  {
    id: "responsibilities",
    title: "第５章　重大な被害が起きたら、調査が終わるまで待つの？",
    sections: [
      {
        label: "",
        body: "いじめによる生命・心身などへの重大な被害や、長期欠席を余儀なくされている疑いがある場合は、「重大事態」として調査する仕組みがあります。被害が確定するまで何もしない、という制度ではありません。",
        sourceRefs: ["draft-full", "major-incidents", "mext-guideline"],
      },
      {
        label: "",
        body: "素案は、調査と子ども・保護者への支援を並行して進めることを明記しています。事実を調べている間も、安全や学ぶ権利を守ります。また、専門家による調査委員会を位置付け、区長が必要と認める場合の再調査や、事案が終わった後の継続支援も定めています。",
        sourceRefs: ["draft-full", "major-incidents", "mext-guideline"],
      },
    ],
    quiz: {
      question: "重大事態の調査中、子どもへの支援はどうなりますか？",
      options: [
        "A．事実関係が確定するまで始めない",
        "B．調査報告書が完成した後に検討する",
        "C．調査と並行して、安全や学習を支える",
      ],
      correctIndex: 2,
      explanation:
        "「何が起きたかを調べること」と「今の子どもを支えること」は、同時に進める方針です。調査終了を支援開始の条件にはしていません。",
      sourceRefs: ["draft-full", "major-incidents", "mext-guideline"],
    },
  },
  {
    id: "investigation-and-accountability",
    title: "第６章　私立学校の子どもや、転校した子どもは対象外？",
    sections: [
      {
        label: "",
        body: "素案の具体的な対応を定める規定は、主に区立小・中学校の児童生徒を対象としています。私立学校などに、区立学校と同じ規定がそのまま適用されるわけではありません。",
        sourceRefs: ["draft-full", "draft-overview"],
      },
      {
        label: "",
        body: "一方で、区立以外の学校に通う子どもも、必要な支援につながるよう努めるとしています。転校・進学によって支援が途切れないよう、学校や関係機関との連携も進める方針です。つまり、規定の適用範囲と、連携して支える範囲を分けている構成です。",
        sourceRefs: ["draft-full", "draft-overview"],
      },
    ],
    quiz: {
      question:
        "区立学校以外に通う子どもへの対応について、正しいものはどれでしょう？",
      options: [
        "A．区立学校と適用は異なるが、関係機関との連携で必要な支援につなげる",
        "B．区立学校と全く同じ対応を、区が直接行う",
        "C．区立学校に在籍していなければ、区は一切関わらない",
      ],
      correctIndex: 0,
      explanation:
        "区立学校への具体的な対応と、区立以外の学校との連携は、別に定められています。「同じ規定が適用されない」ことは、「支援に一切関わらない」ことを意味しません。",
      sourceRefs: ["draft-full", "draft-overview"],
    },
  },
] as const;
