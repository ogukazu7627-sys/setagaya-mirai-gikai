"use client";

import { ArrowRight, Building2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BudgetExplorationProgram } from "../../shared/types/budget-exploration";
import { buildBudgetProgramGeneralDescription } from "../../shared/utils/budget-program-general-description";
import { formatBudgetAmount } from "../../shared/utils/budget-page-view";
import { useBudgetMapV2Mode } from "../hooks/use-budget-map-v2-environment";

type BudgetProgramPreviewPanelProps = {
  program: BudgetExplorationProgram | null;
  onOpenChange: (open: boolean) => void;
  onOpenDetail: () => void;
};

export function BudgetProgramPreviewPanel({
  program,
  onOpenChange,
  onOpenDetail,
}: BudgetProgramPreviewPanelProps) {
  const mode = useBudgetMapV2Mode();
  const side = mode === "desktop" ? "right" : "bottom";

  return (
    <Sheet open={program !== null} onOpenChange={onOpenChange}>
      {program && (
        <SheetContent
          side={side}
          data-panel-side={side}
          className={
            mode === "desktop"
              ? "w-[min(440px,92vw)] border-budget-space-line bg-budget-space-deep text-white sm:max-w-[440px]"
              : "max-h-[82svh] rounded-t-md border-budget-space-line bg-budget-space-deep text-white"
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SheetHeader className="border-b border-budget-space-line px-5 pb-5 pt-6 pr-12 text-left">
              <span className="text-xs font-bold tracking-[0.08em] text-budget-space-eyebrow">
                当初予算額
              </span>
              <SheetTitle className="text-xl leading-8 text-white">
                {program.displayProgramName}
              </SheetTitle>
              <p className="pt-1 text-2xl font-bold tabular-nums text-budget-node-mint">
                {formatBudgetAmount(program.amountThousandYen)}
              </p>
            </SheetHeader>

            <div className="space-y-6 px-5 py-5">
              <section aria-labelledby="budget-program-preview-description">
                <h2
                  id="budget-program-preview-description"
                  className="text-sm font-bold text-white"
                >
                  一般的な説明（みらい議会）
                </h2>
                <SheetDescription className="mt-2 text-sm leading-7 text-budget-space-copy">
                  {buildBudgetProgramGeneralDescription(program)}
                </SheetDescription>
              </section>

              <section aria-labelledby="budget-program-preview-hierarchy">
                <h2
                  id="budget-program-preview-hierarchy"
                  className="flex items-center gap-2 text-sm font-bold text-white"
                >
                  <Landmark aria-hidden="true" className="size-4" />
                  公式の予算分類
                </h2>
                <dl className="mt-3 grid grid-cols-[3rem_1fr] gap-x-3 gap-y-3 text-sm">
                  <HierarchyRow label="会計" value={program.accountName} />
                  <HierarchyRow label="款" value={program.kanName} />
                  <HierarchyRow label="項" value={program.kouName} />
                  <HierarchyRow label="目" value={program.mokuName} />
                </dl>
              </section>

              <section aria-labelledby="budget-program-preview-department">
                <h2
                  id="budget-program-preview-department"
                  className="flex items-center gap-2 text-sm font-bold text-white"
                >
                  <Building2 aria-hidden="true" className="size-4" />
                  担当部署
                </h2>
                <p className="mt-2 text-sm leading-6 text-budget-space-copy">
                  {program.departmentDisplayName || "表示名未整備"}
                </p>
              </section>
            </div>
          </div>

          <SheetFooter className="border-t border-budget-space-line bg-budget-space-deep px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <Button
              type="button"
              onClick={onOpenDetail}
              className="min-h-11 w-full rounded-md"
            >
              詳しい予算情報を見る
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          </SheetFooter>
        </SheetContent>
      )}
    </Sheet>
  );
}

function HierarchyRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-bold text-budget-space-eyebrow">{label}</dt>
      <dd className="min-w-0 break-words text-budget-space-copy">{value}</dd>
    </>
  );
}
