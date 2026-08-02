"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import type {
  BudgetAccountCode,
  BudgetDirectoryHierarchyEntry,
  BudgetDirectorySelection,
  BudgetDirectorySort,
} from "../../shared/types/budget";
import { getBudgetHierarchyFilterOptions } from "../../shared/utils/budget-directory";

type BudgetDirectoryKind = "expenditure" | "revenue";

export function BudgetDirectoryFilters({
  hierarchy,
  kind,
  selection,
}: {
  hierarchy: BudgetDirectoryHierarchyEntry[];
  kind: BudgetDirectoryKind;
  selection: BudgetDirectorySelection;
}) {
  const [accountCode, setAccountCode] = useState<BudgetAccountCode | "">(
    selection.accountCode ?? ""
  );
  const [kanCode, setKanCode] = useState(selection.kanCode ?? "");
  const [kouCode, setKouCode] = useState(selection.kouCode ?? "");
  const [mokuCode, setMokuCode] = useState(selection.mokuCode ?? "");
  const [includeZeroAmount, setIncludeZeroAmount] = useState(
    selection.includeZeroAmount
  );
  const [sort, setSort] = useState<BudgetDirectorySort>(selection.sort);
  const options = useMemo(
    () =>
      getBudgetHierarchyFilterOptions(hierarchy, {
        accountCode: accountCode || null,
        kanCode: kanCode || null,
        kouCode: kouCode || null,
      }),
    [accountCode, hierarchy, kanCode, kouCode]
  );
  const action =
    kind === "expenditure" ? routes.budgetAll() : routes.budgetRevenue();

  return (
    <form
      action={action}
      className="border-y border-mirai-border bg-white px-4 py-5 sm:px-6"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-mirai-text">
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        絞り込み
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <FilterSelect
          label="会計"
          name="account"
          value={accountCode}
          options={options.accounts}
          onChange={(value) => {
            setAccountCode(value as BudgetAccountCode | "");
            setKanCode("");
            setKouCode("");
            setMokuCode("");
          }}
        />
        <FilterSelect
          disabled={!accountCode}
          label="款"
          name="kan"
          value={kanCode}
          options={options.kans}
          onChange={(value) => {
            setKanCode(value);
            setKouCode("");
            setMokuCode("");
          }}
        />
        <FilterSelect
          disabled={!kanCode}
          label="項"
          name="kou"
          value={kouCode}
          options={options.kous}
          onChange={(value) => {
            setKouCode(value);
            setMokuCode("");
          }}
        />
        <FilterSelect
          disabled={!kouCode}
          label="目"
          name="moku"
          value={mokuCode}
          options={options.mokus}
          onChange={setMokuCode}
        />
        <label className="grid gap-1.5 text-xs font-bold text-mirai-text-secondary">
          並び順
          <select
            name="sort"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as BudgetDirectorySort)
            }
            className="h-11 min-w-0 rounded-md border border-mirai-border bg-white px-3 text-sm font-medium text-mirai-text outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <option value="amount_desc">金額が大きい順</option>
            <option value="name_asc">名称順</option>
          </select>
        </label>
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-mirai-text">
          <input
            type="checkbox"
            name="includeZeroAmount"
            value="true"
            checked={includeZeroAmount}
            onChange={(event) => setIncludeZeroAmount(event.target.checked)}
            className="size-5 accent-primary"
          />
          0円の項目も表示
        </label>
        <div className="flex gap-2">
          <Button
            asChild
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-md"
          >
            <Link href={action}>
              <RotateCcw aria-hidden="true" className="size-4" />
              条件をリセット
            </Link>
          </Button>
          <Button type="submit" size="sm" className="rounded-md">
            表示を更新
          </Button>
        </div>
      </div>
    </form>
  );
}

function FilterSelect({
  disabled = false,
  label,
  name,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: Array<{ code: string; name: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-mirai-text-secondary">
      {label}
      <select
        disabled={disabled}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-0 rounded-md border border-mirai-border bg-white px-3 text-sm font-medium text-mirai-text outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:bg-mirai-surface disabled:text-mirai-text-muted"
      >
        <option value="">すべて</option>
        {options.map((option) => (
          <option key={`${option.code}-${option.name}`} value={option.code}>
            {option.code} {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
