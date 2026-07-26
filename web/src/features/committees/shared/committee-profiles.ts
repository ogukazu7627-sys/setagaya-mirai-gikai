export type CommitteeKind = "standing" | "operations" | "special";

export type CommitteeProfile = {
  name: string;
  kind: CommitteeKind;
  summary: string;
  responsibilities: string[];
};

export const COMMITTEE_KIND_LABELS: Record<CommitteeKind, string> = {
  standing: "常任委員会",
  operations: "議会運営委員会",
  special: "特別委員会",
};

export const COMMITTEE_OFFICIAL_OVERVIEW_URL =
  "https://www.city.setagaya.lg.jp/02030/9514.html";
export const COMMITTEE_OFFICIAL_AGENDA_URL =
  "https://www.city.setagaya.lg.jp/02030/9515.html";

const COMMITTEE_PROFILES: readonly CommitteeProfile[] = [
  {
    name: "企画総務常任委員会",
    kind: "standing",
    summary:
      "区全体の計画や調整、お金と組織の運営など、区政の土台となる事項を審査します。",
    responsibilities: ["区政の総合的企画・調整", "行財政運営"],
  },
  {
    name: "区民生活常任委員会",
    kind: "standing",
    summary:
      "日々の区民生活、市民活動、男女共同参画、地域の産業など、暮らしに身近な事項を審査します。",
    responsibilities: ["区民生活", "市民活動・男女共同参画", "産業振興"],
  },
  {
    name: "福祉保健常任委員会",
    kind: "standing",
    summary:
      "高齢者・障害者・子どもを含む福祉と、健康や保健衛生に関する事項を審査します。",
    responsibilities: ["社会福祉", "保健衛生"],
  },
  {
    name: "都市整備常任委員会",
    kind: "standing",
    summary:
      "まちの整備、住まい、道路や公共交通など、都市の将来と生活基盤に関する事項を審査します。",
    responsibilities: ["都市整備", "住宅政策", "交通政策"],
  },
  {
    name: "文教常任委員会",
    kind: "standing",
    summary:
      "学校での学びや教育環境、生涯を通じた学習に関する事項を審査します。",
    responsibilities: ["児童・生徒の教育環境", "生涯学習"],
  },
  {
    name: "議会運営委員会",
    kind: "operations",
    summary:
      "本会議の日程や進め方など、区議会を円滑に運営するための事項を協議します。",
    responsibilities: ["議会の運営"],
  },
  {
    name: "DX・地域行政・公共施設整備等推進特別委員会",
    kind: "special",
    summary:
      "行政のデジタル化、地域行政、公共施設や本庁舎など、分野をまたぐ中長期的な課題を調査します。",
    responsibilities: [
      "デジタルトランスフォーメーション",
      "地域行政制度",
      "公共施設整備",
      "本庁舎整備",
      "火葬場設置の検討",
      "国公有地等の対策",
    ],
  },
  {
    name: "災害・防犯・オウム問題対策等特別委員会",
    kind: "special",
    summary:
      "災害への備えや防災、危機管理、防犯、オウム・カルト問題など、区民の安全に関わる課題を調査します。",
    responsibilities: [
      "総合的な災害対策",
      "危機管理の総合調整",
      "防犯対策",
      "オウム・カルト問題対策",
    ],
  },
  {
    name: "子ども・若者施策推進特別委員会",
    kind: "special",
    summary:
      "子ども・子育て支援と若者施策を、複数の行政分野にまたがって調査します。",
    responsibilities: ["子ども・子育て支援", "若者施策の推進"],
  },
  {
    name: "環境・清掃・リサイクル対策等特別委員会",
    kind: "special",
    summary:
      "気候や環境、ごみ処理、資源循環など、持続可能な暮らしに関わる課題を調査します。",
    responsibilities: ["環境総合対策", "清掃事業", "リサイクル事業"],
  },
] as const;

const PROFILE_BY_NAME = new Map(
  COMMITTEE_PROFILES.map((profile) => [profile.name, profile])
);

export const PUBLIC_COMMITTEE_NAMES = COMMITTEE_PROFILES.map(
  (profile) => profile.name
);

export function getCommitteeProfile(name: string): CommitteeProfile {
  return (
    PROFILE_BY_NAME.get(name) ?? {
      name,
      kind: inferCommitteeKind(name),
      summary:
        "議案や請願・陳情などを専門的に審査し、区政上の課題を詳しく調べる委員会です。",
      responsibilities: ["委員会に付託された案件の審査・調査"],
    }
  );
}

function inferCommitteeKind(name: string): CommitteeKind {
  if (name.includes("議会運営")) {
    return "operations";
  }
  if (name.includes("特別委員会")) {
    return "special";
  }
  return "standing";
}
