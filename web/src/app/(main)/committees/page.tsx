import type { Metadata } from "next";
import { CommitteeDirectoryPage } from "@/features/committees/server/components/committee-directory-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "委員会 | みらい議会＠世田谷区",
  description:
    "世田谷区議会の各委員会の役割、話し合うテーマ、公開中の案件を確認できます。",
};

export default function CommitteesPage() {
  return <CommitteeDirectoryPage />;
}
