import type { Metadata } from "next";
import { BudgetQuestionPage } from "@/features/budget/server/components/budget-question-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "議員の質問 | 触れる予算",
  description:
    "世田谷区議会で行われた質問を、触れる予算から確認できます。当初予算の配分や執行を示すものではありません。",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BudgetQuestionRoutePage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  return <BudgetQuestionPage questionId={questionId} />;
}
