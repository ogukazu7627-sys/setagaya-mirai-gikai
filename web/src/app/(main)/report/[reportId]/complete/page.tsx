import { ReportCompletePage } from "@/features/interview-report/server/components/report-complete-page";

interface InterviewReportPageProps {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InterviewReportPage({
  params,
  searchParams,
}: InterviewReportPageProps) {
  const { reportId } = await params;
  const search = searchParams ? await searchParams : {};

  return (
    <ReportCompletePage
      reportId={reportId}
      petitionDocUrl={firstSearchValue(search.petition_doc_url) ?? null}
      petitionDocError={firstSearchValue(search.petition_doc_error) ?? null}
    />
  );
}
