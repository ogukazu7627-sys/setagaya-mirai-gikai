"use client";

import {
  Baby,
  BriefcaseBusiness,
  Building2,
  CircleDot,
  Factory,
  GraduationCap,
  HandHeart,
  House,
  Landmark,
  Leaf,
  type LucideIcon,
  Shield,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  BudgetMapV2CategoryNode,
  BudgetMapV2DistantNode,
  BudgetMapV2ProgramNode,
  BudgetMapV2TopicNode,
} from "../../../shared/utils/budget-map-v2-scene";
import {
  formatBudgetAmount,
  shortenBudgetDepartmentName,
} from "../../../shared/utils/budget-page-view";
import type { BudgetMapV2Style } from "./budget-map-v2-layers";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  education: GraduationCap,
  "child-rearing": Baby,
  welfare: HandHeart,
  "urban-development": Building2,
  "disaster-prevention": Shield,
  "administration-finance": Landmark,
  "culture-sports": Trophy,
  industry: Factory,
  environment: Leaf,
  "daily-life": House,
};

function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? CircleDot;
}

function getPositionStyle(
  node: { x: number; y: number; hue: number },
  extra: Record<string, string> = {}
): BudgetMapV2Style {
  return {
    "--budget-map-node-x": `${node.x}px`,
    "--budget-map-node-y": `${node.y}px`,
    "--budget-v2-hue": `${node.hue}`,
    ...extra,
  } as BudgetMapV2Style;
}

/** overview の分野ノード。ラベルは中心から放射方向へ逃がす。 */
export function BudgetMapV2CategoryNodeButton({
  disabled,
  node,
  onSelect,
  selected,
}: {
  disabled: boolean;
  node: BudgetMapV2CategoryNode;
  onSelect: (slug: string) => void;
  selected: boolean;
}) {
  const Icon = getCategoryIcon(node.slug);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(node.slug)}
      disabled={disabled}
      data-selected={selected}
      aria-label={`${node.label}から予算を探す`}
      className="budget-map-v2-node budget-map-v2-category-node budget-map-v2-selectable hover:bg-transparent"
      style={getPositionStyle(node, {
        "--budget-v2-label-x": `${node.labelOffsetX}px`,
        "--budget-v2-label-y": `${node.labelOffsetY}px`,
      })}
    >
      <span aria-hidden="true" className="budget-map-v2-category-halo" />
      <span aria-hidden="true" className="budget-map-v2-category-disc">
        <Icon className="size-[17px]" strokeWidth={1.5} />
      </span>
      <span className="budget-map-v2-category-label-box">
        <span className="budget-map-v2-category-label">{node.label}</span>
        <span aria-hidden="true" className="budget-map-v2-category-rule" />
        <span className="budget-map-v2-category-sub">{node.sub}</span>
      </span>
    </Button>
  );
}

/** category の課題ノード。 */
export function BudgetMapV2TopicNodeButton({
  disabled,
  node,
  onSelect,
  selected,
}: {
  disabled: boolean;
  node: BudgetMapV2TopicNode;
  onSelect: (topicSlug: string) => void;
  selected: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(node.slug)}
      disabled={disabled}
      data-selected={selected}
      aria-label={`${node.title}に関連する予算事業を見る`}
      className="budget-map-v2-node budget-map-v2-topic-node budget-map-v2-selectable h-auto whitespace-normal hover:bg-transparent"
      style={getPositionStyle(node)}
    >
      <span aria-hidden="true" className="budget-map-v2-topic-halo" />
      <span aria-hidden="true" className="budget-map-v2-topic-disc">
        <Target className="size-[19px]" strokeWidth={1.5} />
      </span>
      <span className="budget-map-v2-topic-text">
        <span className="budget-map-v2-topic-title">{node.title}</span>
        <span className="budget-map-v2-topic-meta">
          関連する予算事業 {node.programCount}件
        </span>
      </span>
    </Button>
  );
}

/**
 * topic の事業ノード。丸の大きさは表示中ページ内での相対的な大小だけを表し、
 * 重要度や優先順位は示さない。0円の事業も必ず「0円」と表示する。
 */
export function BudgetMapV2ProgramNodeButton({
  disabled,
  node,
  onSelect,
  selected,
}: {
  disabled: boolean;
  node: BudgetMapV2ProgramNode;
  onSelect: (budgetProgramIdentityId: string) => void;
  selected: boolean;
}) {
  const amount = formatBudgetAmount(node.amountThousandYen);
  const department = shortenBudgetDepartmentName(node.departmentName);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(node.budgetProgramIdentityId)}
      disabled={disabled}
      data-selected={selected}
      data-tier={node.tier}
      data-zero-amount={node.isZeroAmount}
      aria-label={`${node.name}、当初予算額${amount}、担当${department}、詳細を見る`}
      className="budget-map-v2-node budget-map-v2-program-node budget-map-v2-selectable h-auto whitespace-normal hover:bg-transparent"
      style={getPositionStyle(node, {
        "--budget-v2-program-size": `${node.diameter}px`,
      })}
    >
      <span aria-hidden="true" className="budget-map-v2-program-halo" />
      <span aria-hidden="true" className="budget-map-v2-program-disc">
        <BriefcaseBusiness
          style={{ width: node.iconSizePx, height: node.iconSizePx }}
          strokeWidth={1.5}
        />
      </span>
      <span className="budget-map-v2-program-text">
        <span className="budget-map-v2-program-name">{node.name}</span>
        <span className="budget-map-v2-program-amount">{amount}</span>
        <span className="budget-map-v2-program-meta">
          {department}
          {node.otherCategoryNames.length > 0
            ? ` ／ ${node.otherCategoryNames[0]}`
            : ""}
        </span>
      </span>
    </Button>
  );
}

/** category 画面で遠景に残す他分野。押すとその分野へ切り替わる。 */
export function BudgetMapV2DistantNodeButton({
  disabled,
  node,
  onSelect,
}: {
  disabled: boolean;
  node: BudgetMapV2DistantNode;
  onSelect: (slug: string) => void;
}) {
  const Icon = getCategoryIcon(node.slug);
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(node.slug)}
      disabled={disabled}
      aria-label={`${node.label}へ切り替える`}
      className="budget-map-v2-node budget-map-v2-distant-node h-auto hover:bg-transparent"
      style={getPositionStyle(node)}
    >
      <span aria-hidden="true" className="budget-map-v2-distant-disc">
        <Icon className="size-3.5" strokeWidth={1.5} />
      </span>
      <span className="budget-map-v2-distant-label">{node.label}</span>
    </Button>
  );
}
