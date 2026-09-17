export const DEMENTIA_HOPE_PLAN_LEARNING_REVIEWED_AT = "2026-09-18";
export const DEMENTIA_HOPE_PLAN_LEARNING_ESTIMATED_TIME = "7〜10分";

export const DEMENTIA_HOPE_PLAN_LESSONS = [
  {
    id: "plan-purpose",
    title:
      "第１章｜何のための計画？――本人の意思を大切にしながら、暮らしを支える",
    sections: [
      {
        label: "",
        body: "世田谷区は2020年に「認知症とともに生きる希望条例」を施行し、2021年度から計画に基づく取組を進めています。その中心にあるのは、認知症になってからも、本人の意思や権利が尊重され、自分らしく暮らせる地域をつくることです。",
        sourceRefs: ["hope-ordinance", "current-plan", "draft-full"],
      },
      {
        label: "",
        body: "今回の素案は、2027～2029年度の３年間を対象としています。新しい条例をつくるのではなく、これまでの相談支援や地域活動を引き継ぎ、医療・介護、本人の社会参加、暮らしやすい地域づくりをつなげて進めようとしています。",
        sourceRefs: ["draft-summary", "draft-full", "hope-ordinance"],
      },
    ],
    quiz: {
      question: "今回の素案は、どのような位置づけでしょうか？",
      options: [
        "A．認知症の人が利用する医療保険を新設するもの",
        "B．すでにある条例の理念を具体化する、３年間の施策を示すもの",
        "C．認知症に関する条例を初めて制定するもの",
      ],
      correctIndex: 1,
      explanation:
        "条例が基本的な理念や役割を定め、計画がそれを実現するための取組を示します。今回は、その第３期に当たります。",
      sourceRefs: ["draft-summary", "draft-full", "hope-ordinance"],
    },
  },
  {
    id: "new-view",
    title: "第２章｜認知症への見方を変える――知識だけでなく、日常の対応へ",
    sections: [
      {
        label: "",
        body: "区が広めようとしている「新しい認知症観」は、認知症になった人を一律に「何も分からない、何もできない」と捉えず、本人の意思や感情、できることに目を向ける考え方です。これは、希望条例の前文にも示されています。",
        sourceRefs: ["hope-ordinance", "draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "素案では、学校や地域での講座に加え、金融機関、コンビニ、スーパーなどにも理解を広げます。本人に合わせた対応や分かりやすい案内表示など、学んだことを、買い物や外出のしやすさにつなげる方針です。医療・介護の専門職だけでなく、日常生活に関わる人や事業者も取組の対象です。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question:
        "素案では、認知症への理解や対応力を、どこに広げようとしていますか？",
      options: [
        "A．認知症を診療する医療機関だけ",
        "B．本人と同居している家族だけ",
        "C．学校や地域に加え、金融機関や身近な店舗などにも広げる",
      ],
      correctIndex: 2,
      explanation:
        "相談や治療の場だけでなく、買い物や地域活動など、普段の暮らしを支える場での理解と実践を進めます。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "participation",
    title:
      "第３章｜本人と一緒に地域をつくる――参加するだけでなく、企画にも関わる",
    sections: [
      {
        label: "",
        body: "区は、地域で認知症に関する活動を行う「アクションチーム」が全28地区で結成されたと報告しています。一方、本人の参加が、地域づくりや意思決定に十分反映されていないことも課題に挙げています。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "第３期では、本人の声を、活動の内容や進め方に反映することを目指します。あわせて、本人同士が経験や悩みを分かち合う「ピアサポート」や、得意なことを生かして活動・仕事に関われる場を広げます。参加の機会は、本人の希望に応じて選べるようにする方針です。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
    ],
    quiz: {
      question: "「ピアサポート」とは、どのような取組でしょうか？",
      options: [
        "A．認知症の本人同士が、経験や思いを分かち合い、支え合う取組",
        "B．医師が認知症の診断結果を説明する取組",
        "C．家族だけで本人の今後の暮らしを決める取組",
      ],
      correctIndex: 0,
      explanation:
        "同じ立場の人との出会いや交流を通じて、悩みや暮らしの工夫を共有する取組です。素案では、こうしたつながりの充実を掲げています。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
  {
    id: "preparation",
    title: "第４章｜「備え」とは？――健康づくりに加え、自分の希望を伝えておく",
    sections: [
      {
        label: "",
        body: "素案の「認知症への備え」には、健康づくりや介護予防だけでなく、変化に早く気づいて相談すること、見守りなどで生活上の不安やリスクに対応することも含まれています。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "また、区が活用を進める「私の希望ファイル」は、これからどのように暮らしたいか、大切にしたいことは何かを記録し、周囲と共有するためのものです。終末期の希望だけを書くものではなく、思いが変われば何度でも書き直すことを想定しています。自分で書くことが難しい場合は、親しい人に聞き取って記録してもらうこともできます。",
        sourceRefs: ["hope-ordinance", "draft-full", "current-plan"],
      },
    ],
    quiz: {
      question:
        "「私の希望ファイル」の説明として、合っているものはどれでしょうか？",
      options: [
        "A．終末期の医療についてだけ記録するもの",
        "B．暮らしの希望を記録し、思いの変化に合わせて書き直していくもの",
        "C．一度記入した内容は変更できないもの",
      ],
      correctIndex: 1,
      explanation:
        "一度決めた内容に本人を合わせるのではなく、変化する思いを繰り返し確かめ、本人らしい暮らしにつなげることを想定しています。",
      sourceRefs: ["hope-ordinance", "draft-full", "current-plan"],
    },
  },
  {
    id: "continuous-support",
    title: "第５章｜診断の前後をつなぐ――本人にも家族にも、相談と支援を",
    sections: [
      {
        label: "",
        body: "素案では、もの忘れ相談の窓口であるあんしんすこやかセンターの周知や、医療機関・介護事業所との連携を進めます。診断を受けて終わりではなく、その前後から地域での生活まで、支援が途切れない体制を目指しています。",
        sourceRefs: ["draft-summary", "draft-full", "consultation"],
      },
      {
        label: "",
        body: "対象は本人だけではありません。家族の不安や介護負担への相談、専門職の研修も含まれます。さらに、若年性認知症については、就労、生活、子育てなどの課題も扱い、障害福祉と介護保険の制度のはざまにも配慮する方針です。",
        sourceRefs: ["draft-summary", "draft-full", "consultation"],
      },
    ],
    quiz: {
      question:
        "若年性認知症への支援として、素案に含まれているものはどれでしょうか？",
      options: [
        "A．医療機関の紹介だけを行うこと",
        "B．高齢になってから相談を受け付けること",
        "C．医療に加え、就労・生活・子育てなどの相談にも対応すること",
      ],
      correctIndex: 2,
      explanation:
        "素案は、病気への対応だけでなく、その人が担っている仕事や家庭生活も含めて支える方針を示しています。",
      sourceRefs: ["draft-summary", "draft-full", "consultation"],
    },
  },
  {
    id: "evaluation",
    title:
      "第６章｜計画の成果をどう確かめる？――評価方法と、まだ決まっていない部分",
    sections: [
      {
        label: "",
        body: "区は、取組の進み具合を認知症施策評価委員会などに報告し、評価・検証の結果をホームページ等で公表する方針です。",
        sourceRefs: ["draft-full", "hope-ordinance"],
      },
      {
        label: "",
        body: "素案には、講座の参加人数、本人が参画する地区の割合、区民の認知症に対する考え方などの評価指標が示されています。ただし、数値目標は「調整中」です。「何人が参加したか」と「本人の暮らしがどう変わったか」は異なるため、どの指標で何を確かめる計画なのかが、意見を考える際の確認点になります。",
        sourceRefs: ["draft-summary", "draft-full"],
      },
      {
        label: "",
        body: "今回の意見募集は、2026年９月29日（火）必着です。意見・提案は、区ホームページや郵送などで提出できます。",
        sourceRefs: ["public-comment-page"],
      },
    ],
    quiz: {
      question: "今回の素案の評価指標について、正しい説明はどれでしょうか？",
      options: [
        "A．指標の案は示されているが、数値目標は調整中である",
        "B．すべての数値目標が確定している",
        "C．取組の結果を評価・公表する予定はない",
      ],
      correctIndex: 0,
      explanation:
        "何を測るかという案と、どこまで達成するかという数値目標は別です。素案では前者が示され、後者は調整中となっています。",
      sourceRefs: ["draft-summary", "draft-full"],
    },
  },
] as const;
