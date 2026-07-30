import type { Metadata } from "next";
import { BudgetPage } from "@/features/budget/server/components/budget-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "触れる予算 | みらい議会＠世田谷区",
  description:
    "世田谷区の令和8年度当初予算を、暮らしに近い分野や自然な言葉から探せます。",
  alternates: {
    canonical: "/budget",
  },
};

export default function BudgetRoutePage() {
  return <BudgetPage />;
}
