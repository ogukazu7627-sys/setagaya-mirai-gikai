"use client";

import type { InterviewMode } from "@mirai-gikai/shared/interview-prompts/types";
import { useCallback, useEffect, useState } from "react";
import { GoogleLoginGate } from "@/features/chat/client/components/google-login-gate";
import type { ChatAuthStatus } from "@/features/chat/client/hooks/use-chat-auth";
import { InterviewChatClient } from "./interview-chat-client";

type InitializeResponse = {
  session: {
    id: string;
    started_at: string;
    rating: number | null;
  };
  messages: Array<{
    id: string;
    role: "assistant" | "user";
    content: string;
    created_at: string;
  }>;
  mode: InterviewMode;
  totalQuestions: number;
  estimatedDuration: number | null;
  sessionStartedAt: string;
  hasRated: boolean;
  billTitle: string;
};

interface InterviewSidePanelProps {
  billId: string;
  isActive: boolean;
  previewOnly?: boolean;
  authStatus: ChatAuthStatus;
  authError?: string;
  onSignInWithGoogle: () => Promise<void>;
}

export function InterviewSidePanel({
  billId,
  isActive,
  previewOnly = false,
  authStatus,
  authError,
  onSignInWithGoogle,
}: InterviewSidePanelProps) {
  const [data, setData] = useState<InitializeResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isPreparingInitialQuestion, setIsPreparingInitialQuestion] =
    useState(false);
  const [initializeError, setInitializeError] = useState<string | null>(null);

  const isAuthLoading = authStatus === "loading";
  const isLocked = !previewOnly && authStatus !== "authenticated";

  const requestInitialize = useCallback(
    async (deferInitialQuestion: boolean) => {
      const res = await fetch("/api/interview/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId, deferInitialQuestion }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "AIインタビューを開始できませんでした"
        );
      }

      return body as InitializeResponse;
    },
    [billId]
  );

  useEffect(() => {
    if (!isActive || previewOnly || isLocked || data || initializeError) {
      return;
    }

    let cancelled = false;

    async function initializeInterview() {
      setIsInitializing(true);
      setInitializeError(null);
      try {
        const body = await requestInitialize(true);

        if (!cancelled) {
          setData(body);
        }
      } catch (error) {
        if (!cancelled) {
          setInitializeError(
            error instanceof Error
              ? error.message
              : "AIインタビューを開始できませんでした"
          );
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void initializeInterview();

    return () => {
      cancelled = true;
    };
  }, [
    data,
    initializeError,
    isActive,
    isLocked,
    previewOnly,
    requestInitialize,
  ]);

  useEffect(() => {
    if (
      !isActive ||
      previewOnly ||
      isLocked ||
      !data ||
      data.messages.length > 0 ||
      initializeError
    ) {
      return;
    }

    let cancelled = false;

    async function prepareInitialQuestion() {
      setIsPreparingInitialQuestion(true);
      try {
        const hydratedBody = await requestInitialize(false);
        if (!cancelled) {
          setData(hydratedBody);
        }
      } catch (error) {
        if (!cancelled) {
          setInitializeError(
            error instanceof Error
              ? error.message
              : "AIインタビューを開始できませんでした"
          );
        }
      } finally {
        if (!cancelled) {
          setIsPreparingInitialQuestion(false);
        }
      }
    }

    void prepareInitialQuestion();

    return () => {
      cancelled = true;
    };
  }, [
    data,
    initializeError,
    isActive,
    isLocked,
    previewOnly,
    requestInitialize,
  ]);

  if (previewOnly) {
    return (
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-4 pt-2">
        <div className="rounded-2xl border border-primary/20 bg-mirai-surface-light px-4 py-4">
          <p className="text-sm font-bold leading-[1.8] text-mirai-text">
            このプレビューではAIインタビュー回答は準備中です。
          </p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-end px-6 pb-4 pt-2">
        <div className="mb-auto rounded-2xl bg-mirai-surface-light px-4 py-4">
          <p className="text-sm font-bold leading-[1.8] text-mirai-text">
            AIがいくつか質問し、あなたの意見を整理します。
          </p>
          <p className="mt-1 text-xs font-medium leading-relaxed text-mirai-text-muted">
            Googleログイン後、このパネル内でインタビューを進められます。
          </p>
        </div>
        <GoogleLoginGate
          message="AIインタビューを使うにはGoogleログインが必要です"
          isAuthLoading={isAuthLoading}
          onSignInWithGoogle={onSignInWithGoogle}
          className="rounded-[28px] border border-primary/30 bg-white/95 px-4 py-2 shadow-sm"
        />
        {authError && (
          <p className="mt-2 text-xs font-medium text-red-600">{authError}</p>
        )}
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-between px-6 pb-4 pt-2">
        <div className="flex flex-1 flex-col justify-center gap-2">
          <p className="text-sm font-bold leading-[1.8] text-mirai-text">
            AIインタビューを開いています。
          </p>
          <p className="text-xs font-medium leading-relaxed text-mirai-text-muted">
            初回だけ接続を確認しています。
          </p>
        </div>
        <div className="rounded-[50px] border border-primary/20 bg-white px-6 py-3 text-sm font-medium text-mirai-text-placeholder">
          AIの質問に回答する
        </div>
      </div>
    );
  }

  if (initializeError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-3 px-6 pb-4 pt-2">
        <p className="text-sm font-bold leading-[1.8] text-red-600">
          {initializeError}
        </p>
        <button
          type="button"
          className="self-start rounded-full border border-black px-4 py-2 text-sm font-bold hover:bg-gray-50"
          onClick={() => {
            setInitializeError(null);
            setData(null);
          }}
        >
          もう一度試す
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center px-6 pb-4 pt-2">
        <p className="text-center text-sm font-bold leading-[1.8] text-mirai-text">
          AIインタビューを準備します。
        </p>
      </div>
    );
  }

  return (
    <InterviewChatClient
      billId={billId}
      billTitle={data.billTitle}
      sessionId={data.session.id}
      initialMessages={data.messages}
      mode={data.mode}
      totalQuestions={data.totalQuestions}
      estimatedDuration={data.estimatedDuration}
      sessionStartedAt={data.sessionStartedAt}
      hasRated={data.hasRated}
      layout="panel"
      isPreparingInitialQuestion={isPreparingInitialQuestion}
    />
  );
}
