import fs from "node:fs";
import path from "node:path";
import type { BudgetTopicDefinitionFile } from "./budget-topic-definitions";
import {
  getBudgetTopicPublicationStatus,
  getBudgetTopicShortName,
} from "./budget-topic-publication-policy";

type CandidateMatcher =
  BudgetTopicDefinitionFile["topics"][number]["rules"][number]["all"][number];
type CandidateRule =
  BudgetTopicDefinitionFile["topics"][number]["rules"][number];

interface ExpansionTopicSpec {
  slug: string;
  name: string;
  description: string;
  sourceAdministrativeTopicSlug: BudgetTopicDefinitionFile["topics"][number]["sourceAdministrativeTopicSlug"];
  relationType: CandidateRule["relationType"];
  mokuNames?: string[];
  accountCodes?: string[];
  any?: CandidateMatcher[];
  none?: CandidateMatcher[];
}

interface ExpansionCategorySpec {
  fileName: string;
  category: { slug: string; name: string };
  topics: ExpansionTopicSpec[];
}

const editorialNote =
  "みらい議会の探索用編集データ。公式予算の会計・款・項・目と事業名に基づく候補であり、世田谷区の公式な課題分類ではない。";

function mokuTopic(
  slug: string,
  name: string,
  description: string,
  sourceAdministrativeTopicSlug: NonNullable<
    ExpansionTopicSpec["sourceAdministrativeTopicSlug"]
  >,
  mokuNames: string[],
  relationType: CandidateRule["relationType"] = "supports"
): ExpansionTopicSpec {
  return {
    slug,
    name,
    description,
    sourceAdministrativeTopicSlug,
    relationType,
    mokuNames,
  };
}

export const budgetConcreteTopicExpansionCatalog: ExpansionCategorySpec[] = [
  {
    fileName: "11-education-concrete-topics.json",
    category: { slug: "education", name: "教育" },
    topics: [
      mokuTopic(
        "diverse-learning-and-education-support",
        "多様な学びと教育相談を充実する",
        "一人ひとりに応じた学び、教育相談、特別支援教育、学習機会に関する予算を探す入口。",
        "education-and-learning-administration",
        ["教育指導費", "教育振興費", "教育センター費"]
      ),
      mokuTopic(
        "school-health-and-safety",
        "学校での健康と安全を守る",
        "児童・生徒・園児の健康診断や保健衛生に関する予算を探す入口。",
        "education-and-learning-administration",
        ["学校保健費"],
        "maintains"
      ),
      mokuTopic(
        "safe-and-accessible-school-meals",
        "安心できる学校給食を届ける",
        "学校給食の運営、調理場、保護者負担の軽減に関する予算を探す入口。",
        "education-and-learning-administration",
        ["学校給食管理費", "学校給食費", "給食費"],
        "maintains"
      ),
      mokuTopic(
        "early-childhood-education-support",
        "幼児教育と預かり保育を支える",
        "区立幼稚園、認定こども園、預かり保育、園児の健康に関する予算を探す入口。",
        "education-and-learning-administration",
        ["幼稚園管理費", "幼稚園保健費"]
      ),
      mokuTopic(
        "learning-experiences-beyond-school",
        "学校外の体験と学びを広げる",
        "移動教室、林間学園など学校外での体験と学びに関する予算を探す入口。",
        "education-and-learning-administration",
        ["校外施設費"]
      ),
      mokuTopic(
        "stable-school-and-education-operations",
        "教育現場を安定して運営する",
        "学校運営、教育委員会、教職員と教育行政の基盤に関する予算を探す入口。",
        "education-and-learning-administration",
        ["教育委員会費", "事務局費", "学校管理費", "学校職員費", "教育職員費"],
        "maintains"
      ),
    ],
  },
  {
    fileName: "12-child-rearing-concrete-topics.json",
    category: { slug: "child-rearing", name: "子育て" },
    topics: [
      mokuTopic(
        "children-youth-places-and-activities",
        "子ども・若者の居場所と活動を広げる",
        "児童館、学童クラブ、中高生支援、自然体験などに関する予算を探す入口。",
        "child-and-family-administration",
        ["児童育成費"]
      ),
      mokuTopic(
        "family-benefits-and-medical-support",
        "子育て世帯の生活と医療を支える",
        "児童手当、医療費助成、ひとり親支援、出産費助成などに関する予算を探す入口。",
        "child-and-family-administration",
        ["児童措置費"]
      ),
      mokuTopic(
        "child-protection-and-family-care",
        "子どもを守り家庭での養育を支える",
        "児童相談、一時保護、家庭養育、児童養護施設などに関する予算を探す入口。",
        "child-and-family-administration",
        ["児童相談所費"],
        "responds_to"
      ),
      mokuTopic(
        "community-child-and-family-support",
        "地域で子どもと家庭を支える",
        "在宅子育て、産後ケア、子どもの権利、若者支援などに関する予算を探す入口。",
        "child-and-family-administration",
        ["児童福祉総務費"]
      ),
      mokuTopic(
        "safe-child-support-facilities",
        "子どもの居場所となる施設を安全に保つ",
        "児童館など子どもが利用する施設の維持管理・改修に関する予算を探す入口。",
        "child-and-family-administration",
        ["保育児童施設費"],
        "maintains"
      ),
    ],
  },
  {
    fileName: "13-welfare-concrete-topics.json",
    category: { slug: "welfare", name: "福祉" },
    topics: [
      mokuTopic(
        "livelihood-security-and-community-welfare",
        "生活の安心と地域福祉を支える",
        "生活困窮、生活保護、地域福祉、相談・権利擁護に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["社会福祉総務費", "生活保護総務費", "扶助費", "国民年金総務費"],
        "responds_to"
      ),
      mokuTopic(
        "disability-community-life-and-independence",
        "障害のある人の地域生活と自立を支える",
        "障害福祉サービス、相談、就労、施設、地域生活に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["障害者福祉費", "障害者施設費"]
      ),
      mokuTopic(
        "older-adult-daily-life-and-care",
        "高齢者の安心した暮らしを支える",
        "見守り、在宅生活、福祉サービス、高齢者施設に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["高齢者福祉費", "高齢者施設費"]
      ),
      mokuTopic(
        "maternal-and-child-health",
        "妊娠・出産と乳幼児の健康を支える",
        "妊産婦・乳幼児健診、家庭訪問、母子保健に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["母子保健費"]
      ),
      mokuTopic(
        "infection-prevention-and-vaccination",
        "感染症を予防し健康を守る",
        "予防接種、感染症・結核対策に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["感染症予防費"],
        "responds_to"
      ),
      mokuTopic(
        "health-screening-and-healthy-lifestyles",
        "健診と日々の健康づくりを進める",
        "がん検診、成人健康診査、食育、生活習慣病予防に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["栄養指導費", "成人病予防費", "公害保健費"]
      ),
      mokuTopic(
        "community-health-and-medical-system",
        "地域の保健・医療体制を整える",
        "保健所、保健センター、地域医療、健康危機管理に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["保健所費", "衛生総務費", "保健センター費", "衛生統計費"],
        "maintains"
      ),
      mokuTopic(
        "food-and-living-hygiene",
        "食と暮らしの衛生を守る",
        "食品衛生、医事薬事、生活環境、動物との共生に関する予算を探す入口。",
        "welfare-health-and-social-security-administration",
        ["環境衛生費"],
        "maintains"
      ),
      {
        ...mokuTopic(
          "welfare-and-public-health-workforce",
          "福祉と保健を支える人材・運営を確保する",
          "福祉・保健分野の職員と行政運営の基盤に関する予算を探す入口。",
          "welfare-health-and-social-security-administration",
          ["民生職員費", "衛生職員費", "職員費"],
          "enables"
        ),
        accountCodes: ["general"],
      },
      {
        slug: "national-health-insurance-and-medical-benefits",
        name: "国民健康保険と医療給付を支える",
        description:
          "国民健康保険の給付、保健事業、保険料事務に関する予算を探す入口。",
        sourceAdministrativeTopicSlug:
          "welfare-health-and-social-security-administration",
        relationType: "supports",
        accountCodes: ["national_health_insurance"],
      },
      {
        slug: "latter-stage-elderly-healthcare",
        name: "後期高齢者医療を支える",
        description:
          "後期高齢者医療の運営、負担金、健康診査に関する予算を探す入口。",
        sourceAdministrativeTopicSlug:
          "welfare-health-and-social-security-administration",
        relationType: "supports",
        accountCodes: ["latter_stage_elderly_healthcare"],
      },
      {
        slug: "long-term-care-insurance-and-services",
        name: "介護保険と介護サービスを支える",
        description:
          "介護保険の給付、要介護認定、保険料事務に関する予算を探す入口。",
        sourceAdministrativeTopicSlug:
          "welfare-health-and-social-security-administration",
        relationType: "supports",
        accountCodes: ["long_term_care_insurance"],
      },
    ],
  },
  {
    fileName: "14-urban-development-concrete-topics.json",
    category: { slug: "urban-development", name: "まちづくり" },
    topics: [
      mokuTopic(
        "safe-streets-and-cycling",
        "歩行者・自転車が安全に移動できる道をつくる",
        "交通安全施設、自転車環境、街路灯、生活道路の整備に関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["交通安全対策費", "街路照明費", "道路新設改良費", "私道整備費"]
      ),
      mokuTopic(
        "flood-river-and-drainage-resilience",
        "豪雨・水害に備え水の流れを整える",
        "河川・水路、雨水、下水道、水洗化に関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["河川総務費", "河川整備費", "公共下水道建設費", "水洗化促進費"],
        "responds_to"
      ),
      mokuTopic(
        "parks-and-public-open-spaces",
        "公園と身近な屋外空間を育てる",
        "公園・広場の維持、新設、改修、公衆トイレに関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["公園管理費", "公園新設改良費", "公衆トイレ費"],
        "maintains"
      ),
      mokuTopic(
        "urban-green-and-water-conservation",
        "まちの緑と水を守り増やす",
        "樹林地、地域緑化、湧水、緑と水のまちづくりに関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["緑化推進費"],
        "maintains"
      ),
      mokuTopic(
        "housing-security-and-quality",
        "安心して住み続けられる住まいを支える",
        "公的住宅、居住支援、住宅改修・保全に関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["住宅費"]
      ),
      mokuTopic(
        "safe-buildings-and-resilient-neighborhoods",
        "安全で災害に強い市街地をつくる",
        "耐震化、建築安全、空家、密集市街地、再開発に関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["建築行政費", "市街地開発費"],
        "responds_to"
      ),
      mokuTopic(
        "stations-transit-and-community-planning",
        "駅・交通と地域のまちづくりを進める",
        "駅周辺、鉄道、バス、バリアフリー、都市計画に関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["都市計画総務費"]
      ),
      mokuTopic(
        "stable-urban-infrastructure-operations",
        "都市基盤を安定して管理する",
        "道路・公共物の管理、土木事務、技術・人員の基盤に関する予算を探す入口。",
        "urban-infrastructure-administration",
        ["土木総務費", "道路橋梁総務費", "土木職員費"],
        "maintains"
      ),
    ],
  },
  {
    fileName: "16-administration-finance-concrete-topics.json",
    category: { slug: "administration-finance", name: "行財政" },
    topics: [
      mokuTopic(
        "public-information-and-citizen-voice",
        "区政情報を届け区民の声を聴く",
        "広報、相談、問い合わせ、区民の声に関する予算を探す入口。",
        "government-and-finance-administration",
        ["広報広聴費"]
      ),
      mokuTopic(
        "democratic-governance-elections-and-oversight",
        "議会・選挙・監査を通じた自治を支える",
        "区議会、選挙、監査と民主的な行政運営に関する予算を探す入口。",
        "government-and-finance-administration",
        [
          "議会費",
          "議会職員費",
          "監査委員費",
          "選挙管理委員会費",
          "地方選挙費",
          "参議院議員選挙費",
          "選挙啓発費",
        ]
      ),
      mokuTopic(
        "sustainable-public-finance-and-taxation",
        "持続可能な財政と公金管理を支える",
        "予算、基金、区債、税、会計と公金管理に関する予算を探す入口。",
        "government-and-finance-administration",
        [
          "財政管理費",
          "財政積立金",
          "賦課徴収費",
          "税務総務費",
          "会計管理費",
          "一時借入金",
          "元金",
          "利子",
          "公債諸費",
          "予備費",
        ],
        "maintains"
      ),
      mokuTopic(
        "evidence-informed-policy-and-partnerships",
        "データと連携で政策をつくる",
        "政策企画、統計、調査研究、官民・大学・自治体連携に関する予算を探す入口。",
        "government-and-finance-administration",
        ["企画調整費", "基幹統計調査費", "統計調査総務費"]
      ),
      mokuTopic(
        "public-assets-buildings-and-fleet",
        "公共資産・建物・車両を適切に保つ",
        "区有財産、公共建築、用地、公用車に関する予算を探す入口。",
        "government-and-finance-administration",
        ["財産管理費", "車両管理費"],
        "maintains"
      ),
      mokuTopic(
        "public-workforce-and-administrative-foundation",
        "行政サービスを支える人と業務基盤を整える",
        "職員、人材育成、文書、庁舎など行政運営の基盤に関する予算を探す入口。",
        "government-and-finance-administration",
        ["一般管理費", "総務職員費"],
        "enables"
      ),
    ],
  },
  {
    fileName: "17-culture-sports-concrete-topics.json",
    category: { slug: "culture-sports", name: "文化・スポーツ" },
    topics: [
      mokuTopic(
        "libraries-reading-and-knowledge-access",
        "図書館と読書・知識へのアクセスを充実する",
        "図書館、図書資料、読書活動、情報システムに関する予算を探す入口。",
        "culture-sports-and-lifelong-learning-administration",
        ["図書館費", "図書館建設費"]
      ),
      mokuTopic(
        "cultural-heritage-and-local-history",
        "文化財と地域の歴史を未来へつなぐ",
        "文化財、郷土資料館、民家園、埋蔵文化財に関する予算を探す入口。",
        "culture-sports-and-lifelong-learning-administration",
        ["文化財費", "資料館費"],
        "maintains"
      ),
      mokuTopic(
        "arts-culture-and-multicultural-exchange",
        "文化芸術と多文化交流を広げる",
        "文化芸術、文化施設、国際交流、外国人の暮らしに関する予算を探す入口。",
        "culture-sports-and-lifelong-learning-administration",
        ["文化・国際費", "文化施設費"]
      ),
      mokuTopic(
        "lifelong-learning-and-community-education",
        "生涯学習と地域の学びを広げる",
        "社会教育、家庭教育、学校開放、放課後の遊び場に関する予算を探す入口。",
        "culture-sports-and-lifelong-learning-administration",
        ["社会教育活動費", "社会教育総務費"]
      ),
      mokuTopic(
        "active-aging-and-community-participation",
        "年齢を重ねても学び地域で活動できる環境をつくる",
        "高齢者の地域参加、学び、交流、いきがいに関する予算を探す入口。",
        "culture-sports-and-lifelong-learning-administration",
        ["生涯現役推進費"]
      ),
      mokuTopic(
        "interregional-exchange-and-rural-experiences",
        "地域間交流と自然体験の機会をつくる",
        "区民健康村の運営・整備と地域間交流に関する予算を探す入口。",
        "culture-sports-and-lifelong-learning-administration",
        ["健康村費"]
      ),
    ],
  },
  {
    fileName: "18-industry-concrete-topics.json",
    category: { slug: "industry", name: "産業" },
    topics: [
      mokuTopic(
        "urban-agriculture-and-farmland",
        "都市農業と農地を次世代につなぐ",
        "農地保全、農業経営、区民農園、農産物の魅力発信に関する予算を探す入口。",
        "industry-agriculture-and-consumer-administration",
        ["農業総務費", "農業委員会費"]
      ),
      mokuTopic(
        "consumer-rights-and-safe-transactions",
        "消費者の権利と安全な取引を守る",
        "消費生活相談、啓発、学習に関する予算を探す入口。",
        "industry-agriculture-and-consumer-administration",
        ["消費者行政費"],
        "responds_to"
      ),
      mokuTopic(
        "stable-industry-administration",
        "地域産業を支える行政基盤を整える",
        "産業・農業・消費生活分野の職員と行政運営に関する予算を探す入口。",
        "industry-agriculture-and-consumer-administration",
        ["産業経済職員費"],
        "enables"
      ),
    ],
  },
  {
    fileName: "19-environment-concrete-topics.json",
    category: { slug: "environment", name: "環境問題" },
    topics: [
      mokuTopic(
        "waste-collection-and-clean-neighborhoods",
        "ごみを適切に収集し清潔なまちを保つ",
        "ごみ・し尿の収集、不法投棄、清掃車両に関する予算を探す入口。",
        "environment-and-resource-circulation-administration",
        ["廃棄物対策費"],
        "maintains"
      ),
      mokuTopic(
        "resource-circulation-and-recycling",
        "ごみを減らし資源を循環させる",
        "分別回収、拠点回収、リサイクル活動に関する予算を探す入口。",
        "environment-and-resource-circulation-administration",
        ["省資源対策費"]
      ),
      mokuTopic(
        "clean-safe-and-comfortable-environment",
        "清潔で安全な生活環境を守る",
        "ポイ捨て、公害、環境監視、生活環境保全に関する予算を探す入口。",
        "environment-and-resource-circulation-administration",
        ["環境対策費"],
        "responds_to"
      ),
      mokuTopic(
        "stable-cleaning-and-environment-operations",
        "清掃・環境サービスの基盤を安定して保つ",
        "清掃施設、事務所、職員、安全衛生と清掃事業運営に関する予算を探す入口。",
        "environment-and-resource-circulation-administration",
        ["清掃管理費", "施設整備費", "環境職員費", "清掃職員費"],
        "maintains"
      ),
    ],
  },
  {
    fileName: "20-daily-life-concrete-topics.json",
    category: { slug: "daily-life", name: "暮らし" },
    topics: [
      {
        ...mokuTopic(
          "safe-community-and-crime-prevention",
          "地域の防犯と暮らしの安全を高める",
          "防犯、犯罪被害者支援、地域の安全安心に関する予算を探す入口。",
          "community-and-resident-services-administration",
          ["区民総務費"],
          "responds_to"
        ),
        any: [
          {
            field: "display_program_name",
            operator: "includes",
            values: ["安全安心", "防犯", "犯罪被害", "防火防災", "災害時"],
          },
        ],
      },
      {
        ...mokuTopic(
          "human-rights-gender-equality-and-peace",
          "人権・男女共同参画・平和を大切にする",
          "人権、DV防止、女性支援、男女共同参画、平和に関する予算を探す入口。",
          "community-and-resident-services-administration",
          ["区民総務費"],
          "responds_to"
        ),
        any: [
          {
            field: "display_program_name",
            operator: "includes",
            values: ["ＤＶ", "人権", "男女共同", "平和"],
          },
        ],
      },
      {
        ...mokuTopic(
          "community-participation-events-and-support",
          "地域活動と区民生活を支える",
          "町会・自治会、市民活動、地域行事、地域行政に関する予算を探す入口。",
          "community-and-resident-services-administration",
          ["区民総務費"]
        ),
        none: [
          {
            field: "display_program_name",
            operator: "includes",
            values: [
              "安全安心",
              "防犯",
              "犯罪被害",
              "防火防災",
              "災害時",
              "ＤＶ",
              "人権",
              "男女共同",
              "平和",
            ],
          },
        ],
      },
      mokuTopic(
        "accessible-local-offices-and-services",
        "身近な地域窓口と行政サービスを保つ",
        "総合支所、出張所、相談、地域窓口の維持・改修に関する予算を探す入口。",
        "community-and-resident-services-administration",
        ["支所費"],
        "maintains"
      ),
      mokuTopic(
        "resident-records-family-register-and-identity",
        "住民記録・戸籍の手続きを確実に届ける",
        "住民票、戸籍、マイナンバーなど住民記録に関する予算を探す入口。",
        "community-and-resident-services-administration",
        ["住民記録費", "戸籍事務費"],
        "maintains"
      ),
      mokuTopic(
        "community-learning-and-civic-facilities",
        "地域の学びと区民利用施設を支える",
        "地域の生涯学習、区民利用施設、区民斎場に関する予算を探す入口。",
        "community-and-resident-services-administration",
        ["区民施設費"],
        "maintains"
      ),
    ],
  },
];

function buildRule(spec: ExpansionTopicSpec): CandidateRule {
  const topicName = getBudgetTopicShortName(spec.slug);
  const all: CandidateMatcher[] = [];
  if (spec.accountCodes) {
    all.push({
      field: "account_code",
      operator: "equals",
      values: spec.accountCodes,
    });
  }
  if (spec.mokuNames) {
    all.push({
      field: "moku_name",
      operator: "equals",
      values: spec.mokuNames,
    });
  }
  return {
    id: `${spec.slug}-official-structure`,
    relationType: spec.relationType,
    evidenceLevel: "B_strong_structural",
    confidence: "high",
    explanation: `公式予算の会計・款・項・目と事業名から「${topicName}」との構造的な関係が強い候補として整理した。これはみらい議会の探索用整理であり、区の公式な課題分類ではない。`,
    all,
    any: spec.any ?? [],
    none: spec.none ?? [],
  };
}

export function buildBudgetConcreteTopicExpansionDefinitionFiles(): Array<{
  fileName: string;
  definition: BudgetTopicDefinitionFile;
}> {
  return budgetConcreteTopicExpansionCatalog.map((category) => ({
    fileName: category.fileName,
    definition: {
      schemaVersion: "budget-topic-definition-v1",
      fiscalYear: 2026,
      budgetType: "initial_budget",
      category: category.category,
      topics: category.topics.map((topic) => ({
        slug: topic.slug,
        name: getBudgetTopicShortName(topic.slug),
        publicationStatus: getBudgetTopicPublicationStatus(topic.slug),
        shortDescription: topic.description,
        topicKind: "goal",
        editorialNote,
        reviewFile: `${topic.slug}-candidates.csv`,
        sourceAdministrativeTopicSlug: topic.sourceAdministrativeTopicSlug,
        rules: [buildRule(topic)],
      })),
    },
  }));
}

export function writeBudgetConcreteTopicExpansionDefinitionFiles(
  outputDirectory: string
): string[] {
  fs.mkdirSync(outputDirectory, { recursive: true });
  return buildBudgetConcreteTopicExpansionDefinitionFiles().map(
    ({ fileName, definition }) => {
      const outputPath = path.join(outputDirectory, fileName);
      fs.writeFileSync(
        outputPath,
        `${JSON.stringify(definition, null, 2)}\n`,
        "utf8"
      );
      return outputPath;
    }
  );
}
