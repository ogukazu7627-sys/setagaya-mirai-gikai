"use client";

import { createBrowserClient } from "@mirai-gikai/supabase";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const GOOGLE_DOCS_CALLBACK_PATH = "/auth/google-docs/callback";
const GOOGLE_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const ERROR_MESSAGES: Record<string, string> = {
  missing_oauth_code:
    "Googleの認可コードを確認できませんでした。もう一度お試しください。",
  invalid_report_id:
    "レポートIDを確認できませんでした。完了ページからやり直してください。",
  google_login_failed:
    "Googleアカウントの確認に失敗しました。もう一度お試しください。",
  missing_google_access_token:
    "Google Docsを作成する権限を確認できませんでした。Googleの同意画面で許可してください。",
  report_not_found: "レポートが見つかりませんでした。",
  unauthorized_report: "このレポートのGoogle Docs下書きは作成できません。",
  bill_not_found: "レポートに紐づく案件が見つかりませんでした。",
  google_docs_create_failed:
    "Google Docs下書きの作成に失敗しました。Google CloudのDocs API設定も確認してください。",
  google_docs_update_failed:
    "Google Docs下書きは作成されましたが、本文の書き込みに失敗しました。",
};

function getCanonicalWebUrl() {
  const configured = process.env.NEXT_PUBLIC_WEB_URL;
  if (configured?.startsWith("http")) {
    return configured.replace(/\/+$/, "");
  }

  return window.location.origin;
}

type PetitionGoogleDocsSectionProps = {
  reportId: string;
  documentUrl?: string | null;
  errorCode?: string | null;
};

export function PetitionGoogleDocsSection({
  reportId,
  documentUrl,
  errorCode,
}: PetitionGoogleDocsSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const errorMessage =
    clientError || (errorCode ? ERROR_MESSAGES[errorCode] : null);

  const handleCreateGoogleDoc = async () => {
    setIsLoading(true);
    setClientError(null);

    const supabase = createBrowserClient();
    const redirectTo = new URL(GOOGLE_DOCS_CALLBACK_PATH, getCanonicalWebUrl());
    redirectTo.searchParams.set("reportId", reportId);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        scopes: `openid email profile ${GOOGLE_DRIVE_FILE_SCOPE}`,
        queryParams: {
          prompt: "consent",
          access_type: "online",
          include_granted_scopes: "true",
        },
      },
    });

    if (error) {
      setIsLoading(false);
      setClientError(
        "Google Docs作成の同意画面を開けませんでした。時間をおいて再度お試しください。"
      );
    }
  };

  return (
    <section className="rounded-lg border border-primary/20 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mirai-light-gradient">
            <FileText className="size-5 text-primary" />
          </span>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-mirai-text">
              請願用Google Docs下書き
            </h3>
            <p className="text-sm font-bold leading-[1.8] text-mirai-text-secondary">
              AIインタビューの内容から請願書の下書きを作ります。住所・氏名・電話番号はサイトには保存せず、作成後のGoogle
              Docsで入力してください。
            </p>
          </div>
        </div>

        {documentUrl && (
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-800 bg-white px-4 py-3 text-sm font-bold text-gray-800"
          >
            作成したGoogle Docsを開く
            <ExternalLink className="size-4" />
          </a>
        )}

        {errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-[1.7] text-red-700">
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          onClick={handleCreateGoogleDoc}
          disabled={isLoading}
          className="w-full text-base"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Googleに確認しています...
            </>
          ) : (
            <>
              <FileText className="size-5" />
              Google Docs下書きを作る
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
