"use client";

import { X } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputError,
  PromptInputHint,
  type PromptInputMessage,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import type { BillWithContent } from "@/features/bills/shared/types";
import type { ChatAuthStatus } from "../hooks/use-chat-auth";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useViewportHeight } from "@/hooks/use-viewport-height";
import { SystemMessage } from "./system-message";
import { UserMessage } from "./user-message";

interface ChatWindowProps {
  billContext?: BillWithContent;
  hasInterviewConfig?: boolean;
  difficultyLevel: string;
  chatState: ReturnType<typeof import("@ai-sdk/react").useChat>;
  isOpen: boolean;
  onClose: () => void;
  pageContext?: {
    type: "home" | "bill";
    bills?: Array<{
      name: string;
      summary?: string;
      tags?: string[];
      isFeatured?: boolean;
    }>;
  };
  disableAutoFocus?: boolean;
  sessionId: string;
  previewOnly?: boolean;
  authStatus: ChatAuthStatus;
  authUserEmail?: string;
  authError?: string;
  onSignInWithGoogle: () => Promise<void>;
}

const COMMON_BILL_QUESTIONS = [
  "この案件のポイントは？",
  "自分にどんな影響がある？",
  "議員に聞くなら何を聞けばいい？",
  "公式資料のどこを見ればいい？",
  "賛成・反対の論点は？",
];

function GoogleGIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px] flex-shrink-0"
      focusable="false"
      viewBox="0 0 18 18"
    >
      <path
        d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
        fill="#4285F4"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getBillSampleQuestions(bill: BillWithContent): string[] {
  const itemTypeQuestions: Partial<
    Record<NonNullable<BillWithContent["item_type"]>, string[]>
  > = {
    bill: ["この議案で何が変わる？", "なぜこの条例改正が必要？"],
    report: ["この報告は今後どう進む？", "これは将来、議案になる？"],
    petition: ["この陳情は今どういう状態？", "採択されると何が起きる？"],
    question: ["議員は何を問題視した？", "区の答弁は十分？"],
  };

  return [
    ...COMMON_BILL_QUESTIONS,
    ...(itemTypeQuestions[bill.item_type] ?? []),
  ];
}

/**
 * Conversation内部で使用するコンポーネント
 * useStickToBottomContextを使用するために分離
 */
function ChatMessages({
  billContext,
  hasInterviewConfig,
  difficultyLevel,
  messages,
  sendMessage,
  status,
  pageContext,
  sessionId,
  previewOnly,
  authStatus,
}: {
  billContext?: BillWithContent;
  hasInterviewConfig?: boolean;
  difficultyLevel: string;
  messages: ChatWindowProps["chatState"]["messages"];
  sendMessage: ChatWindowProps["chatState"]["sendMessage"];
  status: ChatWindowProps["chatState"]["status"];
  pageContext?: ChatWindowProps["pageContext"];
  sessionId: string;
  previewOnly?: boolean;
  authStatus: ChatAuthStatus;
}) {
  const { scrollToBottom } = useStickToBottomContext();
  const safeMessages = messages ?? [];
  const userMessageLength = safeMessages.filter(
    (x) => x.role === "user"
  ).length;
  const isResponding = status === "streaming" || status === "submitted";
  const isChatLocked = !previewOnly && authStatus !== "authenticated";

  // メッセージが追加されたら自動的にスクロール
  useEffect(() => {
    if (userMessageLength > 0) {
      scrollToBottom();
    }
  }, [userMessageLength, scrollToBottom]);

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* 初期メッセージ */}
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold leading-[1.8] text-mirai-text">
            世田谷区議会の案件について、気になることをAIに質問してください。
          </p>
          {billContext && (
            <p className="text-sm font-bold leading-[1.8] text-mirai-text">
              本文中のテキストを選択すると簡単にAIに質問できます
            </p>
          )}
        </div>

        {/* サンプル質問チップ */}
        <div className="flex flex-wrap gap-3">
          {(billContext
            ? getBillSampleQuestions(billContext)
            : [
                "みらい議会って何？",
                "世田谷区議会って何をするところ？",
                "注目の案件について教えて",
              ]
          ).map((question) => {
            return (
              <button
                key={question}
                type="button"
                disabled={isResponding || previewOnly || isChatLocked}
                className="px-3 py-1 text-xs leading-[2] text-primary-accent border border-primary rounded-2xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (previewOnly || isChatLocked) return;
                  sendMessage({
                    text: question,
                    metadata: {
                      billContext,
                      hasInterviewConfig,
                      difficultyLevel,
                      pageContext,
                      sessionId,
                    },
                  });
                }}
              >
                {question}
              </button>
            );
          })}
        </div>
        {previewOnly && (
          <p className="text-xs font-medium leading-relaxed text-mirai-text-muted">
            このプレビューではAI回答は準備中です。見た目のみ確認できます。
          </p>
        )}
      </div>
      {safeMessages.map((message) => {
        const isStreaming =
          status === "streaming" &&
          message.id === safeMessages[safeMessages.length - 1]?.id;

        return message.role === "user" ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <SystemMessage
            key={message.id}
            message={message}
            isStreaming={isStreaming}
            billId={billContext?.id}
            billName={billContext?.bill_content?.title ?? billContext?.name}
          />
        );
      })}
      {status === "submitted" && (
        <span className="text-sm text-gray-500">考え中...</span>
      )}
    </>
  );
}

export function ChatWindow({
  billContext,
  hasInterviewConfig,
  difficultyLevel,
  chatState,
  isOpen,
  onClose,
  pageContext,
  disableAutoFocus = false,
  sessionId,
  previewOnly = false,
  authStatus,
  authError,
  onSignInWithGoogle,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const { messages, sendMessage, status, error } = chatState;
  const safeMessages = messages ?? [];
  const isDesktop = useIsDesktop();
  const viewportHeight = useViewportHeight();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isResponding = status === "streaming" || status === "submitted";
  const isAuthLoading = authStatus === "loading";
  const isChatLocked = !previewOnly && authStatus !== "authenticated";
  const isInputDisabled = previewOnly || isChatLocked;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // チャットが開かれたときにinputにフォーカス（disableAutoFocusがfalseの場合のみ）
  useEffect(() => {
    if (isOpen && textareaRef.current && !disableAutoFocus) {
      textareaRef.current?.focus();
    }
  }, [isOpen, disableAutoFocus]);

  // Auto-resize textarea based on content
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);

    if (!hasText || isResponding || isInputDisabled) {
      return;
    }

    // Send message with context and difficulty level in metadata
    // By default, this sends a HTTP POST request to the /api/chat endpoint.
    sendMessage({
      text: message.text ?? "",
      metadata: {
        billContext,
        hasInterviewConfig,
        difficultyLevel,
        pageContext,
        sessionId,
      },
    });

    // Reset form
    setInput("");
  };

  const chatContent = (
    <>
      {/* オーバーレイ（1400px未満でのみ表示） */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 transition-opacity cursor-default pc:hidden"
          onClick={onClose}
          aria-label="モーダルを閉じる"
        />
      )}

      {/* チャットウィンドウ */}
      <div
        // xlサイズでは、横幅1180px（メイン + チャット）の中央寄せにする
        className={`fixed inset-x-0 bottom-0 z-50
          bg-white shadow-md rounded-t-2xl flex flex-col
          md:bottom-4 md:right-4 md:left-auto md:w-[450px] md:rounded-2xl
					pc:visible pc:opacity-100 h-[80vh] pc:h-[70vh]
          xl:right-[calc(calc(100%-1180px)/2)]
					${isOpen ? "visible opacity-100" : "invisible opacity-0 pc:visible pc:opacity-100"}
				`}
        style={
          viewportHeight && !isDesktop
            ? { maxHeight: `${viewportHeight}px` }
            : undefined
        }
      >
        <button
          type="button"
          className="pc:hidden self-end p-2 m-2 hover:bg-gray-100 rounded-full"
          onClick={onClose}
          aria-label="モーダルを閉じる"
        >
          <X className="h-5 w-5" />
        </button>
        {/* メッセージエリア（スクロール可能） */}
        <Conversation className="flex-1 min-h-0">
          <ConversationContent className="p-0 flex flex-col gap-3 pc:pt-6 pb-2 px-6">
            <ChatMessages
              billContext={billContext}
              hasInterviewConfig={hasInterviewConfig}
              difficultyLevel={difficultyLevel}
              messages={safeMessages}
              sendMessage={sendMessage}
              status={status}
              pageContext={pageContext}
              sessionId={sessionId}
              previewOnly={previewOnly}
              authStatus={authStatus}
            />
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* 入力エリア（固定下部） */}
        <div className="px-6 pb-4 pt-2">
          <div className="relative">
            <PromptInput
              onSubmit={handleSubmit}
              className={`flex items-end gap-2.5 py-2 pl-6 pr-4 bg-white rounded-[50px] border-mirai-gradient divide-y-0 ${
                isChatLocked ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <PromptInputBody className="flex-1">
                <PromptInputTextarea
                  ref={textareaRef}
                  onChange={handleInputChange}
                  value={input}
                  placeholder="わからないことをAIに質問する"
                  disabled={isInputDisabled}
                  rows={1}
                  submitOnEnter={isDesktop}
                  // min-w-0, wrap-anywhere が無いと長文で親幅を押し広げてしまう
                  className={`!min-h-0 min-w-0 wrap-anywhere text-sm font-medium leading-[1.5em] tracking-[0.01em] placeholder:text-mirai-text-placeholder placeholder:font-medium placeholder:leading-[1.5em] placeholder:tracking-[0.01em] placeholder:no-underline border-none focus:ring-0 bg-transparent shadow-none !py-2 !px-0`}
                />
              </PromptInputBody>
              <button
                type="submit"
                disabled={!input || isResponding || isInputDisabled}
                className="flex-shrink-0 w-10 h-10 disabled:opacity-50"
              >
                <Image
                  src="/icons/send-button-icon.svg"
                  alt="送信"
                  width={40}
                  height={40}
                  className="w-full h-full"
                />
              </button>
            </PromptInput>
            {isChatLocked && (
              <div className="absolute inset-0 flex items-center gap-2 rounded-[50px] border border-primary/30 bg-white/95 px-4 shadow-sm">
                <p className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-mirai-text sm:text-xs">
                  {isAuthLoading
                    ? "ログイン状態を確認中です"
                    : "AIチャットを使うにはGoogleログインが必要です"}
                </p>
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={onSignInWithGoogle}
                  aria-label="Google でログイン"
                  className="inline-flex h-10 flex-shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-[#747775] bg-white pl-3 pr-3 text-sm font-medium leading-5 text-[#1F1F1F] shadow-sm transition-colors hover:bg-[#F8F8F8] disabled:cursor-wait disabled:opacity-60"
                  style={{ fontFamily: "Roboto, Arial, sans-serif" }}
                >
                  <GoogleGIcon />
                  Google でログイン
                </button>
              </div>
            )}
          </div>
          <PromptInputError status={status} error={error} />
          {authError && (
            <p className="mt-2 text-xs font-medium text-red-600">{authError}</p>
          )}
          {safeMessages.length > 0 && <PromptInputHint />}
        </div>
      </div>
    </>
  );

  // body直下にPortalでマウント（クライアントサイドのみ）
  if (!isMounted) {
    return null;
  }

  // チャットのストリーミング表示がルビ機能と競合して表示がおかしくなるため、body直下に移動してルビ機能の影響を受けないようにする
  return createPortal(chatContent, document.body);
}
