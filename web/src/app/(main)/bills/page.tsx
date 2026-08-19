import type { Metadata } from "next";
import { BillsDirectoryPage } from "@/features/bills/server/components/bills-directory-page";
import { parseCouncilSearchPage } from "@/features/bills/shared/utils/council-search-page-param";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "議会 | みらい議会＠世田谷区",
  description:
    "世田谷区議会の議案、質問、請願・陳情、報告事項を自然な言葉やテーマから探せます。",
};

type BillsPageProps = {
  searchParams?: Promise<
    Partial<
      Record<
        "type" | "theme" | "committee" | "archive_year" | "page",
        string | string[]
      >
    >
  >;
};

export default async function BillsPage({ searchParams }: BillsPageProps) {
  const params = await searchParams;

  return (
    <BillsDirectoryPage
      initialSearch={{
        type: firstValue(params?.type),
        theme: firstValue(params?.theme),
        committee: firstValue(params?.committee),
      }}
      initialPage={parseCouncilSearchPage(firstValue(params?.page))}
      archiveYear={params?.archive_year}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
