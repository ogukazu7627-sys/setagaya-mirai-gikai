"use client";

import { X } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent, CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { InterviewSidePanel } from "@/features/interview-session/client/components/interview-side-panel";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useVisualViewportFrame } from "@/hooks/use-visual-viewport-frame";
import type { ChatAuthStatus } from "../hooks/use-chat-auth";
import { GoogleLoginGate } from "./google-login-gate";
import { SystemMessage } from "./system-message";
import { UserMessage } from "./user-message";

export type ChatWindowMode = "question" | "interview";

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
  activeMode?: ChatWindowMode;
  onActiveModeChange?: (mode: ChatWindowMode) => void;
}

const COMMON_BILL_QUESTIONS = [
  "この案件のポイントは？",
  "自分にどんな影響がある？",
  "議員に聞くなら何を聞けばいい？",
  "公式資料のどこを見ればいい？",
  "賛成・反対の論点は？",
];

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
  activeMode = "question",
  onActiveModeChange,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const { messages, sendMessage, status, error } = chatState;
  const safeMessages = messages ?? [];
  const isDesktop = useIsDesktop();
  const canShowInterviewInChatPanel = useMediaQuery("(min-width: 768px)");
  const visualViewportFrame = useVisualViewportFrame(isOpen && !isDesktop);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isResponding = status === "streaming" || status === "submitted";
  const isAuthLoading = authStatus === "loading";
  const isChatLocked = !previewOnly && authStatus !== "authenticated";
  const isInputDisabled = previewOnly || isChatLocked;
  const canUseInterview =
    billContext?.interview_enabled === true && hasInterviewConfig === true;
  const canUseInterviewInChatPanel =
    canUseInterview && canShowInterviewInChatPanel;
  const resolvedMode =
    canUseInterviewInChatPanel && activeMode === "interview"
      ? "interview"
      : "question";
  const isMobileSheet = !isDesktop;
  const isKeyboardOpen = visualViewportFrame.keyboardInset > 0;
  const mobileOverlayStyle = useMemo<CSSProperties | undefined>(() => {
    if (!isMobileSheet) {
      return undefined;
    }

    return {
      height: `${visualViewportFrame.height}px`,
      left: `${visualViewportFrame.offsetLeft}px`,
      top: `${visualViewportFrame.offsetTop}px`,
      width: `${visualViewportFrame.width}px`,
    };
  }, [isMobileSheet, visualViewportFrame]);
  const mobileSheetStyle = useMemo<CSSProperties | undefined>(() => {
    if (!isMobileSheet) {
      return undefined;
    }

    const sheetHeight = visualViewportFrame.height * 0.82;
    const sheetTop =
      visualViewportFrame.offsetTop + visualViewportFrame.height - sheetHeight;

    return {
      "--chat-composer-bottom-padding": isKeyboardOpen
        ? "10px"
        : "max(10px, env(safe-area-inset-bottom))",
      bottom: "auto",
      height: `${sheetHeight}px`,
      left: `${visualViewportFrame.offsetLeft}px`,
      right: "auto",
      top: `${sheetTop}px`,
      width: `${visualViewportFrame.width}px`,
    } as CSSProperties;
  }, [isKeyboardOpen, isMobileSheet, visualViewportFrame]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!canUseInterviewInChatPanel && activeMode === "interview") {
      onActiveModeChange?.("question");
    }
  }, [activeMode, canUseInterviewInChatPanel, onActiveModeChange]);

  useEffect(() => {
    if (!isOpen || isDesktop) {
      return;
    }

    const scrollY = window.scrollY;
    const { style: bodyStyle } = document.body;
    const { style: htmlStyle } = document.documentElement;
    const previousBody = {
      left: bodyStyle.left,
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      right: bodyStyle.right,
      top: bodyStyle.top,
      width: bodyStyle.width,
    };
    const previousHtml = {
      overflow: htmlStyle.overflow,
      overscrollBehavior: htmlStyle.overscrollBehavior,
    };

    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollY}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";
    htmlStyle.overflow = "hidden";
    htmlStyle.overscrollBehavior = "none";

    return () => {
      bodyStyle.position = previousBody.position;
      bodyStyle.top = previousBody.top;
      bodyStyle.left = previousBody.left;
      bodyStyle.right = previousBody.right;
      bodyStyle.width = previousBody.width;
      bodyStyle.overflow = previousBody.overflow;
      htmlStyle.overflow = previousHtml.overflow;
      htmlStyle.overscrollBehavior = previousHtml.overscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [isDesktop, isOpen]);

  // チャットが開かれたときにinputにフォーカス（disableAutoFocusがfalseの場合のみ）
  useLayoutEffect(() => {
    if (
      isOpen &&
      resolvedMode === "question" &&
      textareaRef.current &&
      !disableAutoFocus
    ) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [isOpen, disableAutoFocus, resolvedMode]);

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

    if (
      !hasText ||
      isResponding ||
      isInputDisabled ||
      resolvedMode !== "question"
    ) {
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
          className="fixed z-40 bg-black/50 transition-opacity cursor-default pc:hidden"
          style={mobileOverlayStyle}
          onClick={onClose}
          aria-label="モーダルを閉じる"
        />
      )}

      {/* チャットウィンドウ */}
      <div
        // xlサイズでは、横幅1180px（メイン + チャット）の中央寄せにする
        className={`fixed z-50
          bg-white shadow-md rounded-t-2xl flex flex-col overscroll-contain touch-pan-y
          md:bottom-4 md:right-4 md:left-auto md:w-[450px] md:rounded-2xl md:h-[80vh]
						pc:visible pc:opacity-100 pc:h-[70vh]
          xl:right-[calc(calc(100%-1180px)/2)]
          transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none
						${isOpen ? "visible translate-y-0 opacity-100" : "invisible translate-y-full opacity-0 pc:visible pc:translate-y-0 pc:opacity-100"}
					`}
        data-testid="chat-window-sheet"
        style={mobileSheetStyle}
      >
        <button
          type="button"
          className="pc:hidden self-end p-2 m-2 hover:bg-gray-100 rounded-full"
          onClick={onClose}
          aria-label="モーダルを閉じる"
        >
          <X className="h-5 w-5" />
        </button>
        {canUseInterviewInChatPanel && (
          <div className="px-6 pb-2 pc:pt-6">
            <div
              aria-label="チャットモード"
              className="grid h-10 grid-cols-2 rounded-full border border-primary/25 bg-mirai-surface-light p-1"
              role="tablist"
            >
              {(
                [
                  ["question", "質問"],
                  ["interview", "AIインタビュー"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={resolvedMode === mode}
                  onClick={() => onActiveModeChange?.(mode)}
                  className={`rounded-full text-sm font-bold leading-none transition-colors ${
                    resolvedMode === mode
                      ? "bg-white text-mirai-text shadow-sm"
                      : "text-mirai-text-muted hover:text-mirai-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className="flex min-h-0 flex-1 flex-col overscroll-contain"
          hidden={resolvedMode !== "question"}
        >
          {/* メッセージエリア（スクロール可能） */}
          <Conversation className="flex-1 min-h-0 overscroll-contain touch-pan-y">
            <ConversationContent
              className={`p-0 flex flex-col gap-3 pb-2 px-6 ${
                canUseInterviewInChatPanel ? "pc:pt-0" : "pc:pt-6"
              }`}
            >
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
          <div
            className="shrink-0 bg-white px-6 pb-[var(--chat-composer-bottom-padding,1rem)] pt-2"
            data-testid="chat-window-composer"
          >
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
                    className={`!min-h-0 min-w-0 wrap-anywhere text-base md:text-sm font-medium leading-[1.5em] tracking-[0.01em] placeholder:text-mirai-text-placeholder placeholder:font-medium placeholder:leading-[1.5em] placeholder:tracking-[0.01em] placeholder:no-underline border-none focus:ring-0 bg-transparent shadow-none !py-2 !px-0`}
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
                <GoogleLoginGate
                  message="AIチャットを使うにはGoogleログインが必要です"
                  isAuthLoading={isAuthLoading}
                  onSignInWithGoogle={onSignInWithGoogle}
                  className="absolute inset-0 rounded-[50px] border border-primary/30 bg-white/95 px-4 shadow-sm"
                />
              )}
            </div>
            <PromptInputError status={status} error={error} />
            {authError && (
              <p className="mt-2 text-xs font-medium text-red-600">
                {authError}
              </p>
            )}
            {safeMessages.length > 0 && <PromptInputHint />}
          </div>
        </div>

        {canUseInterviewInChatPanel && (
          <div
            className="flex min-h-0 flex-1 flex-col overscroll-contain touch-pan-y"
            hidden={resolvedMode !== "interview"}
          >
            <InterviewSidePanel
              billId={billContext.id}
              isActive={resolvedMode === "interview"}
              previewOnly={previewOnly}
              authStatus={authStatus}
              authError={authError}
              onSignInWithGoogle={onSignInWithGoogle}
            />
          </div>
        )}
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
