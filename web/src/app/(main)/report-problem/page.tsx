import type { Metadata, Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createIssueReportAction } from "@/features/issue-report/server/actions";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "問題を報告する | みらい議会＠世田谷区",
  description: "みらい議会＠世田谷区への問題報告・お問い合わせフォーム",
};

interface ReportProblemPageProps {
  searchParams?: Promise<{
    billId?: string;
    pageUrl?: string;
    error?: string;
  }>;
}

function getErrorMessage(error?: string) {
  if (error === "save_failed") {
    return "送信に失敗しました。少し時間をおいてもう一度お試しください。";
  }
  if (error === "invalid") {
    return "入力内容を確認してください。本文は必須です。";
  }
  return null;
}

export default async function ReportProblemPage({
  searchParams,
}: ReportProblemPageProps) {
  const params = await searchParams;
  const billId = params?.billId ?? "";
  const pageUrl = params?.pageUrl ?? "";
  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="bg-mirai-surface-light pt-24 pb-16 md:pt-12">
      <Container className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">問題を報告する</CardTitle>
            <CardDescription>
              掲載内容の誤り、リンク切れ、表示の不具合などをお知らせください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {errorMessage}
              </div>
            )}

            <form action={createIssueReportAction} className="grid gap-5">
              <input type="hidden" name="bill_id" value={billId} />
              <input type="hidden" name="page_url" value={pageUrl} />

              {billId && (
                <div className="rounded-lg border bg-white px-4 py-3 text-sm text-mirai-text-secondary">
                  対象案件ID: <span className="font-mono">{billId}</span>
                </div>
              )}

              <label className="grid gap-2 text-sm font-bold">
                種別
                <select
                  name="category"
                  className="h-11 rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  defaultValue="content_issue"
                >
                  <option value="content_issue">掲載内容について</option>
                  <option value="broken_link">リンク切れ</option>
                  <option value="display_issue">表示の不具合</option>
                  <option value="other">その他のお問い合わせ</option>
                </select>
              </label>

              <label
                htmlFor="issue-report-message"
                className="grid gap-2 text-sm font-bold"
              >
                内容
                <Textarea
                  id="issue-report-message"
                  name="message"
                  rows={8}
                  required
                  maxLength={4000}
                  placeholder="気づいた点や確認してほしい内容を書いてください。"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label
                  htmlFor="issue-report-contact-name"
                  className="grid gap-2 text-sm font-bold"
                >
                  お名前（任意）
                  <Input
                    id="issue-report-contact-name"
                    name="contact_name"
                    maxLength={120}
                  />
                </label>
                <label
                  htmlFor="issue-report-contact-email"
                  className="grid gap-2 text-sm font-bold"
                >
                  メールアドレス（任意）
                  <Input
                    id="issue-report-contact-email"
                    name="contact_email"
                    type="email"
                    maxLength={254}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Button type="submit" className="sm:w-fit">
                  送信する
                </Button>
                <Button variant="outline" asChild>
                  <Link href={routes.home() as Route}>トップへ戻る</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
