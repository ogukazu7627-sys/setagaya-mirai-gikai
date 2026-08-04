import type { BudgetExplorationProgram } from "../types/budget-exploration";
import descriptionCatalog from "./budget-program-general-description-catalog.json";

type DescriptionSource = Pick<BudgetExplorationProgram, "displayProgramName">;

const DESCRIPTION_NOTICE =
  "具体的な対象や実施内容はこの表示だけでは確定できません。公式情報は区の公式サイト等でご確認ください。";

const purposesByProgramName: Readonly<Record<string, string>> =
  descriptionCatalog;

export function buildBudgetProgramGeneralDescription(
  program: DescriptionSource
): string {
  const purpose = purposesByProgramName[program.displayProgramName];

  if (!purpose) {
    return `「${program.displayProgramName}」の一般的な説明は現在準備中です。${DESCRIPTION_NOTICE}`;
  }

  return `「${program.displayProgramName}」は一般的には、${purpose}ことに使われる予算です。${DESCRIPTION_NOTICE}`;
}
