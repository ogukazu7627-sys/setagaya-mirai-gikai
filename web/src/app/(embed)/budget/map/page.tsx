import type { Metadata } from "next";
import { BudgetMapEmbed } from "@/features/budget/client/components/budget-map-embed";
import { loadBudgetExploration } from "@/features/budget/server/loaders/load-budget-exploration";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "触れる予算の探索マップ",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BudgetMapRoutePage() {
  const exploration = await loadBudgetExploration();
  return (
    <BudgetMapEmbed
      exploration={exploration}
      initialView={{ kind: "overview" }}
    />
  );
}
