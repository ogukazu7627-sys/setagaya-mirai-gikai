import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";

export type LearnLessonCategory = "essential" | "topic";

export type LearnLessonIconName =
  | "arrow-left-right"
  | "building"
  | "calendar"
  | "chart"
  | "check"
  | "clock"
  | "file"
  | "landmark"
  | "messages"
  | "pen"
  | "search"
  | "users"
  | "video"
  | "vote"
  | "wallet";

export type LearnLessonTone =
  | "amber"
  | "coral"
  | "indigo"
  | "mint"
  | "rose"
  | "sky"
  | "teal"
  | "violet";

export interface LearnLessonVisualStep {
  icon: LearnLessonIconName;
  label: string;
}

export interface LearnLessonSectionItem {
  title: string;
  description: string;
}

export interface LearnLessonSection {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly LearnLessonSectionItem[];
  note?: {
    title: string;
    body: string;
  };
}

export interface LearnLessonSource {
  title: string;
  description: string;
  href: string;
}

export interface LearnLesson {
  slug: string;
  category: LearnLessonCategory;
  title: string;
  summary: string;
  duration: number;
  tone: LearnLessonTone;
  visualSteps: readonly LearnLessonVisualStep[];
  keyPoints: readonly [string, string, string];
  sections: readonly LearnLessonSection[];
  officialSources: readonly LearnLessonSource[];
  relatedSlugs: readonly string[];
  explore: {
    title: string;
    description: string;
    href: string;
  };
}

export const LEARN_CATEGORY_LABELS: Record<LearnLessonCategory, string> = {
  essential: "まずはこれだけ",
  topic: "テーマから学ぶ",
};

export const LEARN_LESSONS = [
  {
    slug: "council-basics",
    category: "essential",
    title: "区議会って何？",
    summary:
      "区民の代表が集まり、世田谷区のルールやお金の使い道を話し合って決める場所です。",
    duration: 3,
    tone: "sky",
    visualSteps: [
      { icon: "users", label: "区民" },
      { icon: "vote", label: "選ぶ" },
      { icon: "landmark", label: "区議会" },
    ],
    keyPoints: [
      "区議会は、区民の代表である区議会議員で構成されます",
      "条例、予算、決算など、区の大切なことを議決します",
      "質問や調査を通じて、区政の進み方もチェックします",
    ],
    sections: [
      {
        title: "区民の代表が、世田谷区の意思を決める",
        paragraphs: [
          "世田谷区のすべての区民が一つの場所に集まり、区政の課題を毎回話し合うことは現実的ではありません。そこで、選挙で選ばれた区議会議員が区民の代表として集まり、暮らしに関わる課題を審議します。",
          "区議会は、区としてどうするかを話し合い、最終的な意思を決めることから「議決機関」と呼ばれます。",
        ],
      },
      {
        title: "区議会が決める主なこと",
        items: [
          {
            title: "条例",
            description:
              "区の制度やルールを新しくつくる、変える、廃止することを決めます。",
          },
          {
            title: "予算と決算",
            description:
              "これから何にお金を使うかを決め、実際にどう使われたかを確認します。",
          },
          {
            title: "重要な契約や人事",
            description:
              "一定の重要な契約や、法律・条例で議会の同意が必要な人事を審議します。",
          },
          {
            title: "区政のチェック",
            description:
              "本会議や委員会で質問し、区の仕事が適切に進んでいるかを確かめます。",
          },
        ],
      },
      {
        title: "暮らしの出来事から議会を見つける",
        paragraphs: [
          "子育て、学校、福祉、防災、道路、公園、ごみなど、身近な行政サービスの多くは区政につながっています。新しい制度や大きな事業が動くとき、その背景に議案や委員会での議論がないかを探すと、区議会がぐっと身近になります。",
        ],
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「区議会の役割としくみ」",
        description:
          "区議会の役割、議員、会派、議決する主な事項を確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_STRUCTURE,
      },
      {
        title: "世田谷区議会 公式サイト",
        description: "議会日程、審議結果、会議録、中継などの入口です。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL,
      },
    ],
    relatedSlugs: ["mayor-and-council", "bill-process"],
    explore: {
      title: "実際の案件を見てみる",
      description:
        "世田谷区議会で扱われている議案、質問、請願・陳情、報告事項をテーマから探せます。",
      href: routes.bills(),
    },
  },
  {
    slug: "mayor-and-council",
    category: "essential",
    title: "区長と区議会",
    summary:
      "ともに区民が選ぶ代表です。役割を分け、対話とチェックを重ねながら区政を進めます。",
    duration: 3,
    tone: "mint",
    visualSteps: [
      { icon: "landmark", label: "区議会" },
      { icon: "arrow-left-right", label: "対話・確認" },
      { icon: "building", label: "区長" },
    ],
    keyPoints: [
      "区議会議員と区長は、どちらも区民が直接選びます",
      "区議会は議決し、区長は決まったことに基づいて区政を進めます",
      "独立した立場から、協力とチェックの両方を行います",
    ],
    sections: [
      {
        title: "どちらも区民の代表",
        paragraphs: [
          "地方自治では、区議会議員だけでなく区長も区民が選挙で選びます。区議会と区長は、どちらかがもう一方の部下になる関係ではありません。それぞれ異なる役割と権限を持つ代表です。",
          "このように、住民が議会の議員と自治体の長をそれぞれ選ぶ仕組みは「二元代表制」と呼ばれます。",
        ],
      },
      {
        title: "決める区議会、実行する区長",
        items: [
          {
            title: "区長と区の職員",
            description:
              "予算案や条例案などを準備し、区議会で決まったことに基づいて行政サービスを実施します。",
          },
          {
            title: "区議会",
            description:
              "提出された議案を審議して賛否を決め、質問や調査を通じて区政を確認します。",
          },
        ],
      },
      {
        title: "対立だけでも、追認だけでもない",
        paragraphs: [
          "区議会は、区長の案をただ認める場でも、いつも反対する場でもありません。提案の目的、費用、影響、実施方法を確かめ、必要なら意見や修正を示しながら、区としての判断をつくります。",
          "ニュースを見るときは「誰が提案したか」「議会で何が問われたか」「最終的にどう決まったか」を分けて追うと、役割の違いが見えやすくなります。",
        ],
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「区議会の役割としくみ」",
        description:
          "議決機関である区議会と、執行機関である区長の関係を確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_STRUCTURE,
      },
      {
        title: "世田谷区議会「会議の進め方」",
        description:
          "本会議や委員会で、質問・審査・表決がどう行われるかを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_PROCEDURE,
      },
    ],
    relatedSlugs: ["council-basics", "plenary-and-committees"],
    explore: {
      title: "区議会議員から議論をたどる",
      description: "議員ごとに、公開案件で行った質問や発言を確認できます。",
      href: routes.councilors(),
    },
  },
  {
    slug: "bill-process",
    category: "essential",
    title: "議案が決まるまで",
    summary:
      "提出された案は、委員会で詳しく調べ、本会議で区議会としての最終判断を行います。",
    duration: 4,
    tone: "amber",
    visualSteps: [
      { icon: "file", label: "提出" },
      { icon: "messages", label: "委員会" },
      { icon: "vote", label: "本会議" },
      { icon: "check", label: "結果" },
    ],
    keyPoints: [
      "議案は、条例や予算などについて区議会の判断を求める案件です",
      "多くの議案は、担当する委員会で詳しく審査されます",
      "最終的な可否は、本会議の表決で決まります",
    ],
    sections: [
      {
        title: "そもそも議案とは",
        paragraphs: [
          "議案は、条例をつくる・変える、予算を決める、重要な契約を結ぶなど、区議会の議決が必要なことについて出される案です。区長から提出されるもののほか、要件を満たして議員から提出されるものもあります。",
          "同じ「案件」でも、行政からの報告や議員の質問など、議決を目的としないものがあります。まず種類を確認すると、その後の読み方がわかります。",
        ],
      },
      {
        title: "基本の流れ",
        items: [
          {
            title: "1. 本会議に提出",
            description: "議案の内容が示され、区議会で審議する対象になります。",
          },
          {
            title: "2. 委員会に付託",
            description:
              "分野を担当する委員会に送り、資料や説明をもとに詳しく審査します。",
          },
          {
            title: "3. 委員会で表決",
            description: "質問や意見を重ね、委員会としての賛否を決めます。",
          },
          {
            title: "4. 本会議で議決",
            description:
              "委員長の報告や討論を経て、区議会として最終的に可決・否決などを決めます。",
          },
        ],
        note: {
          title: "案件によって進み方は変わります",
          body: "委員会への付託を省略する場合や、会期の途中で本会議を開いて表決する場合もあります。個別の案件は、公式の日程・議事資料・審議結果で確認してください。",
        },
      },
      {
        title: "結果を見るときの4つの手がかり",
        paragraphs: [
          "審議結果の一覧では「議案番号」「件名」「付託先」「結果」に注目します。付託先から詳しく調べた委員会がわかり、可決・否決などの結果から区議会の最終判断がわかります。",
          "結論だけでなく、委員会資料や会議録で質問と答弁を読むと、判断の前提や懸念も追えます。",
        ],
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「会議の進め方」",
        description:
          "定例会での質問、委員会付託、審査、本会議での表決の流れを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_PROCEDURE,
      },
      {
        title: "世田谷区議会「定例会・臨時会の結果」",
        description: "会期ごとの議案、議決日、結果などを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_RESULTS,
      },
      {
        title: "世田谷区議会「条例・議案・委員会資料など」",
        description:
          "議案本文や委員会資料など、審議のもとになった公式資料への入口です。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_MATERIALS,
      },
    ],
    relatedSlugs: ["plenary-and-committees", "sessions"],
    explore: {
      title: "案件ごとの流れを見てみる",
      description:
        "公開中の案件を開くと、概要、論点、質問、公式資料へのリンクを確認できます。",
      href: routes.bills(),
    },
  },
  {
    slug: "plenary-and-committees",
    category: "essential",
    title: "本会議と委員会",
    summary:
      "全議員で最終判断する本会議と、分野ごとに詳しく調べる委員会には役割の違いがあります。",
    duration: 4,
    tone: "rose",
    visualSteps: [
      { icon: "landmark", label: "本会議" },
      { icon: "arrow-left-right", label: "報告・付託" },
      { icon: "messages", label: "委員会" },
    ],
    keyPoints: [
      "本会議は、全議員で区議会としての意思を決める場です",
      "委員会は、分野を分けて案件を専門的・効率的に審査します",
      "委員会の結論は本会議に報告され、最終判断の材料になります",
    ],
    sections: [
      {
        title: "本会議は、区議会の最終判断をする場",
        paragraphs: [
          "本会議は、議員全員が議場に集まって行う会議です。代表質問や一般質問が行われ、議案や請願について区議会としての最終的な意思を決めます。",
          "多くの案件では、委員会での審査結果が委員長から報告され、討論を経て表決します。",
        ],
      },
      {
        title: "委員会は、詳しく調べる場",
        paragraphs: [
          "区議会が扱う課題は、福祉、教育、まちづくり、産業、防災など幅広くあります。そこで、分野ごとに委員会を設け、少人数で資料を読み、担当部署へ質問し、内容を詳しく審査します。",
        ],
        items: [
          {
            title: "常任委員会",
            description:
              "区政の分野を分担し、議案・請願や行政からの報告を継続的に扱います。",
          },
          {
            title: "議会運営委員会",
            description: "会議の進め方など、議会運営に関する事項を扱います。",
          },
          {
            title: "特別委員会",
            description:
              "特定の課題を調査・審査するため、必要に応じて設けられます。",
          },
          {
            title: "予算・決算特別委員会",
            description:
              "予算案や決算を、通常の委員会とは別に集中的に審査します。",
          },
        ],
      },
      {
        title: "議論の中身を知りたいなら委員会を見る",
        paragraphs: [
          "本会議の結果だけでは、なぜその判断になったのかが見えにくいことがあります。担当委員会の資料や会議録をたどると、費用、対象者、実施時期、リスクなど、議員が何を確かめたかを詳しく読めます。",
        ],
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「会議の進め方」",
        description:
          "本会議と各種委員会の役割、会議の主なルールを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_PROCEDURE,
      },
      {
        title: "世田谷区議会「委員会」",
        description: "委員会ごとの開催日と審査予定案件を確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_COMMITTEES,
      },
    ],
    relatedSlugs: ["bill-process", "records-and-streaming"],
    explore: {
      title: "委員会から議員を見る",
      description:
        "委員会ごとの所属議員を確認し、どの分野を担当しているかをたどれます。",
      href: routes.committees(),
    },
  },
  {
    slug: "sessions",
    category: "topic",
    title: "定例会・臨時会",
    summary:
      "区議会がまとまって開かれる期間を知ると、日程や審議結果を追いやすくなります。",
    duration: 3,
    tone: "violet",
    visualSteps: [
      { icon: "calendar", label: "2月" },
      { icon: "calendar", label: "6月" },
      { icon: "calendar", label: "9月" },
      { icon: "calendar", label: "11月" },
    ],
    keyPoints: [
      "定例会は、原則として毎年2月・6月・9月・11月に開かれます",
      "必要があるときは、定例会とは別に臨時会が開かれます",
      "会期の中に、本会議や委員会の開催日が並びます",
    ],
    sections: [
      {
        title: "定期的に開く定例会",
        paragraphs: [
          "世田谷区議会の定例会は、原則として毎年2月、6月、9月、11月に開かれます。予算や決算、条例、契約など、その時期に必要な案件をまとめて審議します。",
          "定例会の初めに、会議を行う期間である「会期」を決めます。会期中には、本会議の日と委員会の日がそれぞれ設定されます。",
        ],
      },
      {
        title: "必要に応じて開く臨時会",
        paragraphs: [
          "定例会を待たずに議決が必要な案件があるときなどには、臨時会が開かれます。定例会か臨時会かは、案件の重要度の違いではなく、開催の時期や必要性による区分です。",
        ],
      },
      {
        title: "会期を追う3つの入口",
        items: [
          {
            title: "会議の日程",
            description: "これから開かれる本会議や委員会の日付を確認します。",
          },
          {
            title: "審議予定案件",
            description:
              "どの議案や請願が、いつ、どの委員会で扱われるかを確認します。",
          },
          {
            title: "定例会・臨時会の結果",
            description: "会期が終わった後、議案や請願の最終結果を確認します。",
          },
        ],
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「会議の進め方」",
        description:
          "定例会と臨時会の開催、会期中の基本的な流れを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_PROCEDURE,
      },
      {
        title: "世田谷区議会「会議の日程」",
        description:
          "現在の年度に予定されている本会議・委員会の日程への入口です。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_SCHEDULE,
      },
      {
        title: "世田谷区議会「定例会・臨時会の結果」",
        description: "過去の会期と、会期ごとの審議結果を確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_RESULTS,
      },
    ],
    relatedSlugs: ["bill-process", "records-and-streaming"],
    explore: {
      title: "今年の会期から案件を探す",
      description:
        "みらい議会では、会期ごとの案件とテーマ別の一覧を行き来できます。",
      href: routes.bills(),
    },
  },
  {
    slug: "budget-and-settlement",
    category: "topic",
    title: "予算と決算",
    summary:
      "これからのお金の計画が予算、実際にどう使ったかを確かめるのが決算です。",
    duration: 5,
    tone: "teal",
    visualSteps: [
      { icon: "wallet", label: "予算案" },
      { icon: "search", label: "審査" },
      { icon: "chart", label: "決算" },
    ],
    keyPoints: [
      "予算は、次の年度に何へいくら使うかを定める計画です",
      "決算は、収入と支出の実績を議会が確認する手続きです",
      "世田谷区議会では、特別委員会を設けて集中的に審査します",
    ],
    sections: [
      {
        title: "予算は、これからの区政の設計図",
        paragraphs: [
          "区長は、税金などの収入を見込み、福祉、教育、まちづくり、防災などにどれだけ使うかを予算案としてまとめます。区議会が審議して議決することで、年度の予算が決まります。",
          "金額だけでなく、誰を対象に、何を、いつまでに行うのかを見ると、政策の具体像がつかみやすくなります。",
        ],
      },
      {
        title: "決算は、使った後の確認",
        paragraphs: [
          "年度が終わると、予算に対して実際の収入と支出がどうだったかを決算としてまとめます。区議会は決算を審査し、認定するかどうかを判断します。",
          "予算で掲げた目的が達成されたか、想定より多く・少なく使った理由は何か、次の年度へ改善すべき点はないかを確認する大切な機会です。",
        ],
      },
      {
        title: "資料を見るときの問い",
        items: [
          {
            title: "何を変える予算か",
            description: "新しい事業か、既存事業の拡充・縮小かを確認します。",
          },
          {
            title: "誰に届くか",
            description:
              "対象者、地域、利用条件から、影響を受ける人を確認します。",
          },
          {
            title: "一度きりか、続く支出か",
            description:
              "整備費のような単年度の支出か、毎年続く運営費かを分けて見ます。",
          },
          {
            title: "結果をどう測るか",
            description:
              "人数、利用率、進捗、成果など、後から確かめられる指標を探します。",
          },
        ],
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「区議会の役割としくみ」",
        description:
          "予算の決定と決算の認定が、区議会の議決事項であることを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_STRUCTURE,
      },
      {
        title: "世田谷区議会「会議の進め方」",
        description: "予算特別委員会と決算特別委員会の位置づけを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_PROCEDURE,
      },
      {
        title: "世田谷区議会「条例・議案・委員会資料など」",
        description: "予算・決算を含む議案や委員会資料への入口です。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_MATERIALS,
      },
    ],
    relatedSlugs: ["bill-process", "plenary-and-committees"],
    explore: {
      title: "予算・決算の案件を探す",
      description:
        "案件一覧から、予算や決算に関する公開コンテンツを確認できます。",
      href: routes.bills(),
    },
  },
  {
    slug: "petitions",
    category: "topic",
    title: "請願・陳情",
    summary:
      "区政への要望を区議会へ直接届け、委員会と本会議で扱ってもらうための制度です。",
    duration: 4,
    tone: "coral",
    visualSteps: [
      { icon: "pen", label: "要望を書く" },
      { icon: "messages", label: "委員会" },
      { icon: "vote", label: "本会議" },
    ],
    keyPoints: [
      "請願には、紹介する区議会議員が1人以上必要です",
      "議員の紹介がないものは陳情となり、請願と同様に扱われる場合があります",
      "採択は要望の実現を求める議会の判断で、直ちに実施を決めるものではありません",
    ],
    sections: [
      {
        title: "区民から議会へ、直接要望を届ける",
        paragraphs: [
          "請願・陳情は、区政に関する要望を文書で区議会へ届ける制度です。選挙以外にも、具体的な課題を議会の審査につなげる参加の方法があります。",
          "請願には紹介議員が必要です。紹介議員がいないものは陳情となり、内容などに応じて請願と同様に扱われる場合があります。",
        ],
      },
      {
        title: "提出された後の流れ",
        items: [
          {
            title: "1. 受け付け",
            description:
              "件名、要旨、理由、提出者など、必要な事項を記載して提出します。",
          },
          {
            title: "2. 委員会で審査",
            description:
              "内容を担当する委員会に付託され、要望の趣旨や区の状況を確認します。",
          },
          {
            title: "3. 本会議で判断",
            description:
              "委員会の審査結果をもとに、採択・不採択などを議決します。",
          },
          {
            title: "4. 採択後の対応",
            description:
              "区長への送付や関係機関への意見書提出など、実現に努力するよう求めます。",
          },
        ],
      },
      {
        title: "提出前に公式案内を確認する",
        paragraphs: [
          "世田谷区議会では、区議会事務局の窓口で請願・陳情を受け付け、電子申請も案内しています。必要な記載事項や扱いは変わることがあるため、提出を考えるときは必ず最新の公式案内を確認してください。",
        ],
        note: {
          title: "採択と実施は同じではありません",
          body: "採択は、議会が要望の趣旨に賛同し、その実現を求める判断です。予算、権限、制度設計などが別に必要な場合があり、採択された時点で自動的に実施されるとは限りません。",
        },
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「請願・陳情」",
        description:
          "制度の説明、書き方、受付方法、電子申請への入口を確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_PETITIONS,
      },
      {
        title: "世田谷区議会「これまでに付託された請願・陳情」",
        description: "請願・陳情の件名、付託先、付託日などを確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_PETITIONS_ARCHIVE,
      },
    ],
    relatedSlugs: ["bill-process", "records-and-streaming"],
    explore: {
      title: "請願・陳情の内容を見てみる",
      description:
        "みらい議会で公開している請願・陳情は、背景や論点とあわせて読めます。",
      href: routes.bills(),
    },
  },
  {
    slug: "records-and-streaming",
    category: "topic",
    title: "会議録・中継の見方",
    summary:
      "日程、資料、中継、会議録を使い分けると、議論の前後を公式情報で確かめられます。",
    duration: 4,
    tone: "indigo",
    visualSteps: [
      { icon: "calendar", label: "日程" },
      { icon: "video", label: "中継" },
      { icon: "search", label: "会議録" },
    ],
    keyPoints: [
      "会議前は日程と審査予定案件、会議中は中継を確認します",
      "会議録は、キーワードや発言者などから過去の議論を検索できます",
      "速報版やAI要約は、必ず正式な公式資料と区別して読みます",
    ],
    sections: [
      {
        title: "知りたい時期に合わせて入口を選ぶ",
        items: [
          {
            title: "会議の前",
            description:
              "議会日程や委員会の審査予定案件で、いつ何が扱われるかを確認します。",
          },
          {
            title: "会議の最中・直後",
            description: "議会中継や公開資料で、説明や質疑の様子を確認します。",
          },
          {
            title: "会議の後",
            description:
              "審議結果と会議録で、最終判断と発言の記録を確認します。",
          },
        ],
      },
      {
        title: "会議録検索は、言葉から探せる",
        paragraphs: [
          "世田谷区議会の会議録検索システムでは、キーワード、会議、発言者、役職、所属などを指定して発言を探せます。気になる地名、施設名、制度名を入れると、過去にいつ、誰が、どの会議で取り上げたかをたどれます。",
          "正式な会議録ができるまでの間は速報版が掲載される場合があります。速報版は暫定的な内容で、後から修正されることがあります。",
        ],
      },
      {
        title: "AI要約は入口として使う",
        paragraphs: [
          "みらい議会＠世田谷区では、長い資料や議論を読み始めやすくするためにAIを活用しています。要約は論点を見つける入口であり、公式な記録そのものではありません。",
          "重要な判断をするときや、発言の正確な表現・前後関係を知りたいときは、案件ページにある出典リンクから公式資料、会議録、中継へ戻って確認してください。",
        ],
        note: {
          title: "「事実」「要約」「解釈」を分ける",
          body: "議決結果や公式資料に書かれた内容は事実として確認し、要約は短く整理した説明、論点の読み取りは解釈として区別すると、情報を過度に単純化せずに読めます。",
        },
      },
    ],
    officialSources: [
      {
        title: "世田谷区議会「会議録検索システム」",
        description:
          "検索できる会議録の範囲、検索システム、速報版への入口です。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_MINUTES,
      },
      {
        title: "世田谷区議会「議会中継」",
        description: "本会議などのインターネット中継・録画配信への入口です。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_STREAMING,
      },
      {
        title: "世田谷区議会「会議の日程」",
        description: "これから開かれる会議と、審議予定案件を確認できます。",
        href: EXTERNAL_LINKS.SETAGAYA_COUNCIL_SCHEDULE,
      },
    ],
    relatedSlugs: ["sessions", "plenary-and-committees"],
    explore: {
      title: "要約から公式資料へたどる",
      description:
        "案件ページの概要や論点を入口に、出典として掲載した公式資料を確認できます。",
      href: routes.bills(),
    },
  },
] as const satisfies readonly LearnLesson[];

export type LearnLessonSlug = (typeof LEARN_LESSONS)[number]["slug"];

export const ESSENTIAL_LESSONS = LEARN_LESSONS.filter(
  (lesson) => lesson.category === "essential"
);

export const TOPIC_LESSONS = LEARN_LESSONS.filter(
  (lesson) => lesson.category === "topic"
);

export function findLearnLesson(slug: string) {
  return LEARN_LESSONS.find((lesson) => lesson.slug === slug);
}
