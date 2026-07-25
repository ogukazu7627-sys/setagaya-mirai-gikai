import type { Metadata } from "next";
import { CouncilorDirectoryPage } from "@/features/councilors/server/components/councilor-directory-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "議員 | みらい議会＠世田谷区",
  description:
    "世田谷区議会の議員と、このサイトに掲載している案件での発言を確認できます。",
};

export default function CouncilorsPage() {
  return <CouncilorDirectoryPage />;
}
