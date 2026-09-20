"use client";

import { Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleGIcon } from "@/features/chat/client/components/google-login-gate";
import type { ChatAuthStatus } from "@/features/chat/client/hooks/use-chat-auth";
import { PublicCommentEmailPreference } from "@/features/public-comment/minpaku/client/email-preference";

export type DraftGenerationStatus = "generating" | "ready" | "failed";

export function PublicCommentDraftAuthGate({
  status,
  authStatus,
  userEmail,
  emailOptIn,
  isBusy,
  error,
  onEmailChange,
  onSignIn,
  onRetry,
}: {
  status: DraftGenerationStatus;
  authStatus: ChatAuthStatus;
  userEmail?: string;
  emailOptIn: boolean;
  isBusy: boolean;
  error?: string | null;
  onEmailChange: (value: boolean) => void;
  onSignIn: () => void;
  onRetry: () => void;
}) {
  const authenticated = authStatus === "authenticated";
  const failed = status === "failed";

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-80px)] w-full max-w-[560px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        {failed ? (
          <RefreshCw className="size-7" />
        ) : status === "generating" ? (
          <Loader2 className="size-7 animate-spin" />
        ) : (
          <LockKeyhole className="size-7" />
        )}
      </div>
      <h1 className="mt-6 text-2xl font-bold leading-9">
        {failed
          ? "下書きの作成をもう一度お試しください"
          : status === "generating"
            ? "AIがあなたの意見を整理しています"
            : "下書きが完成しました"}
      </h1>
      <p className="mt-3 text-sm leading-7 text-mirai-text-secondary">
        最終的な文章は、Googleログインで本人確認した後にだけ表示します。
        <br />
        {authenticated
          ? "本人確認が完了しました。文章の完成を確認しています。"
          : "待ち時間にログインを済ませると、完成後すぐに確認できます。"}
      </p>

      <div className="mt-8 w-full rounded-2xl border border-gray-200 bg-white p-5 text-left">
        <PublicCommentEmailPreference
          checked={emailOptIn}
          onChange={onEmailChange}
          disabled={isBusy}
          userEmail={authenticated ? userEmail : undefined}
        />
        {!authenticated && (
          <Button
            type="button"
            onClick={onSignIn}
            disabled={isBusy || authStatus === "loading"}
            className="mt-5 w-full"
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GoogleGIcon />
            )}
            Googleでログインして完成を見る
          </Button>
        )}
        {authenticated && userEmail && (
          <p className="mt-4 break-all text-center text-xs text-mirai-text-secondary">
            ログイン中：{userEmail}
          </p>
        )}
      </div>

      {failed && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          disabled={isBusy}
          className="mt-5 w-full max-w-[360px]"
        >
          <RefreshCw className="size-4" />
          下書き作成を再試行
        </Button>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-destructive">
          {error}
        </p>
      )}
    </main>
  );
}
