export const GENDER_EQUALITY_LEARNING_REVIEWED_AT = "2026-09-18";
export const GENDER_EQUALITY_LEARNING_ESTIMATED_TIME = "7〜10分";

export const GENDER_EQUALITY_LESSONS = [
  {
    id: "plan-purpose",
    title: "第１章　何のための計画？――性別に左右されない選択と参加を支える",
    sections: [
      {
        label: "",
        body: "世田谷区は、2018年に施行した男女共同参画・多文化共生に関する条例などに基づき、性別等にかかわらず、自分の意思で生き方を選び、社会に参加できることを目指してきました。今回のプランは、その理念を具体的な施策につなげる計画です。",
        sourceRefs: ["draft-summary", "draft-full", "ordinance"],
      },
      {
        label: "",
        body: "素案は、女性に偏りやすい育児・介護の負担や、男性に求められがちな長時間労働などを課題に挙げています。女性への支援だけでなく、男性の働き方や性の多様性も対象とし、仕事・家庭・地域など、暮らしの幅広い場面を扱います。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question: "このプランが対象とする範囲は、どれでしょう？",
      options: [
        "A．女性の就職や昇進に関する支援だけ",
        "B．性別等にかかわらず、仕事・家庭・地域などでの選択や参加を支える取組",
        "C．区役所で働く職員の勤務制度だけ",
      ],
      correctIndex: 1,
      explanation:
        "女性が直面する課題への支援を含みながら、男性や性的マイノリティも含めた、多様な人の暮らしを対象としています。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "work-and-care",
    title: "第２章　働くことと、育児・介護をどう支える？",
    sections: [
      {
        label: "",
        body: "区は、育児・介護への支援、ひとり親家庭への支援、女性の就労・起業に関する講座や相談などを進める方針です。同時に、企業にも働きやすい職場づくりを働きかけます。本人や家庭への支援と、職場環境への働きかけを組み合わせる構成です。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "また、子ども・若者が性別にとらわれず将来を考えられる教育や、地域・防災分野での女性の参画も扱います。「らぷらす」の相談・学習・活動支援の機能も充実させる方針です。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question: "仕事と生活の両立について、素案に含まれる取組はどれでしょう？",
      options: [
        "A．家庭への支援と、企業の職場環境づくりへの支援の両方",
        "B．家庭への支援だけで、企業への働きかけは行わない",
        "C．企業への支援だけで、育児・介護や就労の相談は扱わない",
      ],
      correctIndex: 0,
      explanation:
        "両立の課題を本人や家庭だけの問題とせず、企業への働きかけや社会的な支援も組み合わせています。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "violence-and-hardship",
    title: "第３章　暴力や生活の困難に、どう対応する？",
    sections: [
      {
        label: "",
        body: "素案では、DV、交際相手からの暴力であるデートDV、性暴力、職場のハラスメントなどについて、予防のための教育・啓発と被害者支援を進めます。被害者支援は、相談だけでなく、安全の確保や生活の立て直しまでを対象とし、関係機関や児童虐待防止の取組と連携する方針です。",
        sourceRefs: ["draft-summary", "draft-full", "dv-support"],
      },
      {
        label: "",
        body: "また、これまで別の方針に基づいて進めてきた「困難な問題を抱える女性への支援」を、今回の計画に位置付けます。女性相談支援員の体制強化、居場所づくり、民間団体との連携なども盛り込まれています。",
        sourceRefs: ["draft-summary", "draft-full", "women-support-policy"],
      },
    ],
    quiz: {
      question: "素案におけるDV被害者支援の範囲は、どれでしょう？",
      options: [
        "A．暴力を防ぐための広報まで",
        "B．相談窓口を紹介するところまで",
        "C．相談に加え、安全確保や生活再建に向けた支援まで",
      ],
      correctIndex: 2,
      explanation:
        "被害を防ぐ取組と、被害を受けた後の支援の両方を扱っています。相談後に必要な支援へつなぐため、関係機関との連携も掲げています。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "diversity-and-health",
    title: "第４章　性の多様性と、身体の健康をどう支える？",
    sections: [
      {
        label: "",
        body: "区は、性的マイノリティへの理解を広げるとともに、相談や居場所づくり、パートナーシップ・ファミリーシップ宣誓に関する取組を進める方針です。学校や職場だけでなく、防災、医療・福祉の場面も対象にしています。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "併せて、月経や更年期など、性差や年齢に応じた健康課題にも取り組みます。性や妊娠・出産について必要な知識を得て、自分の意思で選択できることを「性と生殖に関する健康・権利」として扱い、子どもから大人まで学ぶ機会を設ける方針です。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question:
        "素案が説明する「性と生殖に関する健康・権利」に含まれるのは、どれでしょう？",
      options: [
        "A．妊娠・出産を予定している人だけに健康情報を提供すること",
        "B．必要な知識や支援を得て、自分の身体や妊娠・出産について意思決定できること",
        "C．本人に代わって、周囲の人が妊娠・出産の方針を決めること",
      ],
      correctIndex: 1,
      explanation:
        "出産を支えることだけでなく、産む・産まないという選択も含め、本人の意思と健康を尊重する考え方です。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "gender-mainstreaming",
    title: "第５章　担当課だけでなく、区役所全体の仕事を見直す",
    sections: [
      {
        label: "",
        body: "今回の柱の一つが、「ジェンダー主流化」です。男女共同参画の担当課だけが取り組むのではなく、さまざまな部署が施策をつくり、実施し、見直す際に、性別等による影響の違いにも目を向ける考え方です。国の第６次男女共同参画基本計画でも、この方向が示されています。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "世田谷区の素案では、職員・管理職向け研修やガイドラインの策定などを掲げています。また、区の審議会等の女性委員割合について、2026年度の35％から、2031年度に40％へという目標を置き、意思決定への参画も扱っています。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question:
        "「ジェンダー主流化」の説明として合っているのは、どれでしょう？",
      options: [
        "A．さまざまな部署が、施策の企画・実施・見直しに男女共同参画の視点を取り入れること",
        "B．男女共同参画の取組を、担当課の講座だけに集約すること",
        "C．女性向けの相談窓口を一か所にまとめること",
      ],
      correctIndex: 0,
      explanation:
        "特定の部署の事業に限定せず、行政全体の仕事の進め方に、その視点を取り入れることを指します。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "evaluation-and-participation",
    title: "第６章　取組の成果をどう確かめ、区民の意見を届ける？",
    sections: [
      {
        label: "",
        body: "区は、成果指標の達成状況や重点事業の進み具合を年１回報告し、検証・評価を事業の改善に反映する方針です。一方、素案には、まだ調整中の数値や目標もあります。",
        sourceRefs: ["draft-summary", "draft-full", "ordinance"],
      },
      {
        label: "",
        body: "計画を読む際には、「何回実施したか」「何人に届いたか」と、「暮らしがどう変わったか」を分けて考えると、指標が何を測っているのかを整理できます。例えば、講座の参加者数だけでは、仕事や家庭での困りごとが減ったかまでは判断できません。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "今回の意見募集は、2026年10月６日（火）必着です。区内在住者に加え、在勤・在学者なども、投稿フォーム、郵送、ファクシミリ、持参で意見を提出できます。",
        sourceRefs: ["public-comment-page"],
      },
    ],
    quiz: {
      question: "計画の進め方として、素案が示しているのはどれでしょう？",
      options: [
        "A．計画を策定した後は、事業内容を変更しない",
        "B．2031年度に計画が終わってから、初めて実施状況を確認する",
        "C．毎年の報告や検証・評価を、事業の改善につなげる",
      ],
      correctIndex: 2,
      explanation:
        "計画は、つくって終わりではありません。実施状況を確認し、評価を踏まえて事業内容や進め方を見直す仕組みが示されています。",
      sourceRefs: ["draft-summary", "draft-full", "ordinance"],
    },
  },
] as const;
