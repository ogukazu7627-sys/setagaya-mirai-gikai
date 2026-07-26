import type { Metadata } from "next";
import { CommitteeDirectoryPage } from "@/features/committees/server/components/committee-directory-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "委員会 | みらい議会＠世田谷区",
  description: "世田谷区議会の委員会と所属議員を確認できます。",
};

export default function CommitteesPage() {
  return <CommitteeDirectoryPage />;
}
