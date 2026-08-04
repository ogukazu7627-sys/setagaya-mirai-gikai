import type { BudgetExplorationProgram } from "../types/budget-exploration";

type DescriptionSource = Pick<
  BudgetExplorationProgram,
  "displayProgramName" | "mokuName"
>;

const DESCRIPTION_NOTICE =
  "具体的な対象や実施内容はこの表示だけでは確定できません。公式情報は区の公式サイト等でご確認ください。";

const PURPOSE_RULES: ReadonlyArray<{
  pattern: RegExp;
  purpose: string;
}> = [
  {
    pattern: /人件費/,
    purpose: "事業を担う職員などの給与や手当をまかなう",
  },
  {
    pattern: /整備|改修|改築|建設|建替|更新/,
    purpose: "施設や設備の整備、改修、更新などを行う",
  },
  {
    pattern: /維持管理|保守|管理運営/,
    purpose: "施設や設備などを維持し、必要な管理や運営を行う",
  },
  {
    pattern: /助成|補助|給付|扶助|支援/,
    purpose: "対象となる人や団体への助成、給付、支援などを行う",
  },
  {
    pattern: /調査|計画|検討/,
    purpose: "現状の調査や計画作成、事業化に向けた検討などを行う",
  },
  {
    pattern: /運営|実施|推進/,
    purpose: "行政サービスや取組を継続して運営、実施する",
  },
];

export function buildBudgetProgramGeneralDescription(
  program: DescriptionSource
): string {
  const matchedPurpose = PURPOSE_RULES.find(({ pattern }) =>
    pattern.test(program.displayProgramName)
  )?.purpose;
  const purpose =
    matchedPurpose ??
    `「${program.mokuName}」の分野で、事業名に示された行政上の取組を行う`;

  return `「${program.displayProgramName}」は一般的には、${purpose}ためのお金です。${DESCRIPTION_NOTICE}`;
}
