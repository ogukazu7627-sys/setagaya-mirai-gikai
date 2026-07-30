import { BUDGET_PUBLIC_BUDGET_TYPE } from "../constants/budget";
import type { BudgetOverview } from "../types/budget";
import type { BudgetPageOverview } from "../types/budget-page";

const thousandYenFormatter = new Intl.NumberFormat("ja-JP");

export function buildBudgetPageOverview(
  overview: BudgetOverview
): BudgetPageOverview {
  const fiscalYear = overview.fiscalYear ?? 2026;
  const hasExpectedActiveDataset =
    overview.activeDataset?.budgetType === BUDGET_PUBLIC_BUDGET_TYPE;
  const validationStatus = hasExpectedActiveDataset
    ? (overview.activeDataset?.validationStatus ?? "公開準備中")
    : "当初予算を公開準備中";

  return {
    title: `${formatJapaneseFiscalYear(fiscalYear)}当初予算`,
    loadStatus: hasExpectedActiveDataset ? "ready" : "empty",
    accountCount: hasExpectedActiveDataset ? overview.accounts.length : 0,
    generalAccount: hasExpectedActiveDataset
      ? (overview.accounts.find(
          (account) => account.accountCode === "general"
        ) ?? null)
      : null,
    expenditureTotalAmountThousandYen: hasExpectedActiveDataset
      ? overview.expenditureTotalAmountThousandYen
      : null,
    revenueTotalAmountThousandYen: hasExpectedActiveDataset
      ? overview.revenueTotalAmountThousandYen
      : null,
    identityCount: hasExpectedActiveDataset ? overview.identityCount : null,
    validationStatus,
    isValidated: validationStatus.toUpperCase() === "PASS",
  };
}

export function buildUnavailableBudgetPageOverview(
  fiscalYear: number
): BudgetPageOverview {
  return {
    title: `${formatJapaneseFiscalYear(fiscalYear)}当初予算`,
    loadStatus: "error",
    accountCount: 0,
    generalAccount: null,
    expenditureTotalAmountThousandYen: null,
    revenueTotalAmountThousandYen: null,
    identityCount: null,
    validationStatus: "取得できません",
    isValidated: false,
  };
}

export function formatJapaneseFiscalYear(fiscalYear: number): string {
  if (fiscalYear >= 2019) {
    return `令和${fiscalYear - 2018}年度`;
  }
  return `${fiscalYear}年度`;
}

export function formatBudgetAmount(amountThousandYen: number): string {
  if (!Number.isSafeInteger(amountThousandYen)) {
    throw new Error("予算額が安全整数ではありません");
  }

  const sign = amountThousandYen < 0 ? "−" : "";
  const absoluteAmount = Math.abs(amountThousandYen);
  const oku = Math.floor(absoluteAmount / 100_000);
  const man = Math.floor((absoluteAmount % 100_000) / 10);
  const thousand = absoluteAmount % 10;
  const parts = [
    oku > 0 ? `${thousandYenFormatter.format(oku)}億` : "",
    man > 0 ? `${thousandYenFormatter.format(man)}万` : "",
    thousand > 0 ? `${thousand}千` : "",
  ];
  const formatted = parts.join("");

  return `${sign}${formatted || "0"}円`;
}

export function formatRawThousandYen(amountThousandYen: number): string {
  return `${thousandYenFormatter.format(amountThousandYen)} 千円`;
}
