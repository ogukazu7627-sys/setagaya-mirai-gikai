import type { Metadata } from "next";
import { BillsDirectoryPage } from "@/features/bills/server/components/bills-directory-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "議会 | みらい議会＠世田谷区",
  description:
    "世田谷区議会で扱われている議案、質問、請願・陳情、報告事項をテーマ別に確認できます。",
};

export default function BillsPage() {
  return <BillsDirectoryPage />;
}
