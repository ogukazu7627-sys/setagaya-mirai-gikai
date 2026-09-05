import type { Route } from "next";
import Link from "next/link";
import { GeneralQuestionCategoryCard } from "@/features/general-questions/client/components/general-question-category-card";
import { routes } from "@/lib/routes";
import type { CouncilDirectoryItem } from "../../../shared/types/council-bill-directory";
import { BillCard } from "./bill-card";

type CouncilDirectoryItemCardProps = {
  item: CouncilDirectoryItem;
};

export function getCouncilDirectoryItemKey(item: CouncilDirectoryItem): string {
  return item.kind === "bill"
    ? `bill:${item.bill.id}`
    : `general-question:${item.category.dietSession.id}:${item.category.categoryId}`;
}

export function CouncilDirectoryItemCard({
  item,
}: CouncilDirectoryItemCardProps) {
  if (item.kind === "general-question-category") {
    return <GeneralQuestionCategoryCard category={item.category} />;
  }

  return (
    <Link
      href={routes.billDetail(item.bill.id) as Route}
      prefetch={false}
      className="block w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
    >
      <BillCard bill={item.bill} />
    </Link>
  );
}
