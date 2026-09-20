"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { useChatAuth } from "@/features/chat/client/hooks/use-chat-auth";
import { ensurePublicCommentActor } from "@/features/public-comment/shared/client/ensure-public-comment-actor";
import {
  type DraftGenerationStatus,
  PublicCommentDraftAuthGate,
} from "@/features/public-comment/shared/client/public-comment-draft-auth-gate";
import { useInterviewConversation } from "@/features/public-comment/shared/client/use-interview-conversation";
import type { PublicCommentEventInvitationResult } from "@/features/public-comment/shared/event-invitation";
import { routes } from "@/lib/routes";
import {
  MINPAKU_CAMPAIGN_TITLE,
  MINPAKU_OFFICIAL_SUBMISSION_URL,
  MINPAKU_ORDINANCES,
  MINPAKU_SOURCES,
  MINPAKU_SUBMISSION_DEADLINE,
  type MinpakuSource,
} from "../shared/campaign";
import {
  PUBLIC_COMMENT_AUTH_RECEIPT_KEY,
  PUBLIC_COMMENT_AUTH_RETURN_KEY,
  PUBLIC_COMMENT_CONSENT_VERSION,
} from "../shared/consent";
import {
  MINPAKU_LEARNING_ESTIMATED_TIME,
  MINPAKU_LESSONS,
} from "../shared/learning";
import type { ReceiptResult } from "../shared/receipt";
import { EventInvitationPreference } from "./event-invitation-preference";
import { PublicCommentConsentModal } from "./public-comment-consent-modal";
import { PublicCommentInterviewChat } from "./public-comment-interview-chat";
import { PublicCommentLearning } from "./public-comment-learning";
import { ReceiptPreference } from "./receipt-preference";
import { usePublicCommentViewScroll } from "./use-public-comment-view-scroll";

type Draft = {
  id: string;
  ai_body: string;
  final_body: string;
  target_ordinances: string[];
  fact_check_notes: string[];
};

type View =
  | "intro"
  | "learning"
  | "interview"
  | "ordinances"
  | "auth"
  | "review"
  | "complete";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[100px] bg-primary px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const OUTLINE_BUTTON_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[100px] border border-black px-6 text-[15px] font-bold text-black transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50";

const RECEIPT_STATUS_MESSAGES: Record<ReceiptResult["status"], string> = {
  not_requested: "",
  accepted:
    "控えメールの送信を受け付けました。到着まで時間がかかる場合があります。届かない場合は迷惑メールフォルダもご確認ください。",
  needs_review:
    "控えメールの送信状況は運営による確認が必要です。下書きは保存されています。",
  pending: "控えメールの送信状況を確認中です。下書きは保存されています。",
  failed: "控えメールの送信を確認できませんでした。下書きは保存されています。",
};

const EVENT_INVITATION_STATUS_MESSAGES: Record<
  PublicCommentEventInvitationResult["status"],
  string
> = {
  not_requested: "",
  accepted:
    "イベント案内メールの送信を受け付けました。到着まで時間がかかる場合があります。",
  needs_review: "イベント案内メールの送信状況は運営による確認が必要です。",
  pending: "イベント案内メールの送信状況を確認中です。",
  failed: "イベント案内メールの送信を確認できませんでした。",
};

function formatDeadline() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(MINPAKU_SUBMISSION_DEADLINE));
}

const FEATURES = [
  {
    iconSrc: "/icons/interview-ear.svg",
    iconSize: { w: 21, h: 29 },
    text: "あなたの経験や考えをAIがチャットで深掘りします",
  },
  {
    iconSrc: "/icons/interview-messages.svg",
    iconSize: { w: 33, h: 26 },
    text: "まず3問で簡易版、続けると最大10回答で詳しく整理します",
  },
  {
    iconSrc: "/icons/interview-landmark.svg",
    iconSize: { w: 30, h: 29 },
    text: "最後にあなたが確認・編集して提出できます",
  },
] as const;

function PublicCommentHeader() {
  return (
    <div className="relative h-50 w-full md:h-80">
      <Image
        src="/illustrations/minpaku-public-comment-hero.png"
        alt="民泊と地域の暮らしを表すイラスト"
        fill
        priority
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 768px"
      />
    </div>
  );
}

function PublicCommentStartActions({
  onStart,
  onLearn,
}: {
  onStart: () => void;
  onLearn: () => void;
}) {
  return (
    <div className="flex w-full max-w-[370px] flex-col items-center gap-3">
      <Button
        type="button"
        onClick={onStart}
        className="h-auto min-h-13 w-full whitespace-normal py-3 text-[15px]"
      >
        AIパブコメインタビューをはじめる
        <ArrowRight className="size-4" />
      </Button>
      <Button
        type="button"
        variant="link"
        onClick={onLearn}
        className="whitespace-normal text-sm leading-6"
      >
        <BookOpen className="size-4" />
        学習してからはじめる
      </Button>
      <p className="text-xs text-mirai-text-secondary">
        {MINPAKU_LESSONS.length}章・各1問 / 目安
        {MINPAKU_LEARNING_ESTIMATED_TIME}
      </p>
    </div>
  );
}

function PublicCommentHero({
  onStart,
  onLearn,
}: {
  onStart: () => void;
  onLearn: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="mb-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-1">
          <span className="text-[13px] font-medium leading-tight text-white">
            世田谷区への意見を考えている方へ
          </span>
        </div>
        <h1 className="text-center text-2xl font-bold leading-[1.5]">
          <span className="block">AIパブコメインタビュー</span>
          <span className="mt-2 block text-xl">{MINPAKU_CAMPAIGN_TITLE}</span>
        </h1>
      </div>

      <div className="flex w-full max-w-[334px] flex-col gap-4 pl-4">
        {FEATURES.map((feature) => (
          <div key={feature.text} className="flex items-center gap-4">
            <div className="flex size-[54px] shrink-0 items-center justify-center rounded-[30px] bg-white">
              <Image
                src={feature.iconSrc}
                alt=""
                width={feature.iconSize.w}
                height={feature.iconSize.h}
              />
            </div>
            <span className="whitespace-pre-line text-[15px] font-medium leading-[1.73] text-black">
              {feature.text}
            </span>
          </div>
        ))}
      </div>

      <PublicCommentStartActions onStart={onStart} onLearn={onLearn} />
    </div>
  );
}

function IntroSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-[560px] space-y-4 rounded-2xl bg-white p-6">
      <h2 className="text-[22px] font-bold leading-[1.64] text-black">
        {title}
      </h2>
      <div className="text-[15px] font-normal leading-[1.87] text-black">
        {children}
      </div>
    </section>
  );
}

function PublicCommentIntro({
  onStart,
  onLearn,
  onViewComments,
}: {
  onStart: () => void;
  onLearn: () => void;
  onViewComments: () => void;
}) {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <PublicCommentHeader />
      <div className="flex flex-col items-center gap-8 px-4">
        <PublicCommentHero onStart={onStart} onLearn={onLearn} />

        <IntroSection title="インタビュー概要">
          <div className="space-y-4">
            <p>
              世田谷区が募集している、民泊・旅館業の条例改正素案へのパブリックコメントについて、AIがあなたの経験や考えを深掘りするチャット型インタビューです。
            </p>
            <p>
              回答をもとに、事実、あなたの意見、理由、具体的な提案を分けて、提出前の下書きに整理します。賛成・反対をAIが決めることはありません。
            </p>
            <p>
              意見募集の期限は
              <strong className="font-bold text-primary-accent">
                {formatDeadline()}
              </strong>
              です。
            </p>
          </div>
        </IntroSection>

        <IntroSection title="進め方">
          <p className="text-[22px] font-bold leading-[1.64] text-primary-accent">
            まず3問、続けると最大10回答の詳細版
          </p>
          <p className="mt-2 text-[13px] leading-[1.69]">
            3問で簡易版を作成できます。詳しく続ける場合も、回答は最大10回です。答えたくないテーマは飛ばせます。
          </p>
        </IntroSection>

        <IntroSection title="質問テーマ">
          <div className="flex flex-col gap-3">
            {[
              "このテーマとの関わり方",
              "特に気になっている論点",
              "具体的な経験・不安・期待",
              "区の説明と自分の考えの関係",
              "必要な条件や運用",
              "区に求める具体的な対応",
              "最も伝えたいことの最終確認",
            ].map((theme) => (
              <div key={theme} className="flex gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full">
                  <Image
                    src="/icons/check-icon.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="mt-2 object-contain"
                  />
                </div>
                <span>{theme}</span>
              </div>
            ))}
          </div>
        </IntroSection>

        <IntroSection title="確認できる資料・議員の発信">
          <div className="space-y-4">
            <p>
              インタビューでは、世田谷区の意見募集ページ、区の考え、改正素案概要、新旧対照表を前提にします。他区の制度は比較情報として、議員の発信は本人の主張として区別して参照します。
            </p>
            <div className="space-y-3">
              {MINPAKU_SOURCES.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2 text-sm font-bold leading-6 text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="mt-1 size-4 shrink-0" />
                  <span>{source.title}</span>
                </a>
              ))}
            </div>
          </div>
        </IntroSection>

        <IntroSection title="注意事項">
          <div className="space-y-3 text-[13px] leading-[1.69]">
            <p>
              このインタビューはAIが対話形式で実施します。AIの下書きは、提出前に必ずあなた自身が確認・編集してください。
            </p>
            <p>
              個人名、住所、部屋番号、施設名などの個人を特定できる情報は入力しないでください。公式ページへの提出や匿名公開は自動では行いません。
            </p>
            <p>
              回答は同意後に専用のデータベースへ保存します。匿名公開を希望する場合も、運営の確認後に承認された本文だけが公開されます。
            </p>
            <p>
              学習とAIインタビューはログインなしで利用できます。最終文章の表示と編集には、作成待ちの画面でGoogleログインが必要です。今回の控えメールの受信は任意です。
            </p>
          </div>
        </IntroSection>

        <div className="w-full max-w-[560px]">
          <button
            type="button"
            onClick={onViewComments}
            className="text-xs leading-[1.83] text-black underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            これまでに公開されたコメントを見る
          </button>
        </div>

        <div className="flex w-full max-w-[370px] flex-col space-y-4">
          <PublicCommentStartActions onStart={onStart} onLearn={onLearn} />
          <Link href={routes.publicCommentMinpakuComments() as Route}>
            <Button type="button" variant="outline" className="w-full">
              公開コメントを見る
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function OrdinanceSelection({
  selectedOrdinances,
  isBusy,
  onToggle,
  onGenerate,
}: {
  selectedOrdinances: string[];
  isBusy: boolean;
  onToggle: (ordinance: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-layout-offset))] flex-col bg-mirai-light-gradient px-4 py-8">
      <section className="mx-auto w-full max-w-[560px] rounded-2xl bg-white p-6">
        <p className="text-sm font-bold text-primary">下書きの対象</p>
        <h1 className="mt-2 text-[22px] font-bold leading-[1.64] text-black">
          どの条例について意見を書きますか？
        </h1>
        <p className="mt-3 text-[15px] leading-[1.87] text-black">
          片方だけでも、両方をまとめても作成できます。
        </p>
        <div className="mt-7 space-y-3">
          {MINPAKU_ORDINANCES.map((ordinance) => {
            const checked = selectedOrdinances.includes(ordinance);
            return (
              <label
                key={ordinance}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 text-[15px] leading-[1.87] text-black transition-colors hover:border-primary"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(ordinance)}
                  className="mt-1 size-4 shrink-0 rounded accent-primary"
                />
                {ordinance}
              </label>
            );
          })}
        </div>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={selectedOrdinances.length === 0 || isBusy}
          className={`${PRIMARY_BUTTON_CLASS} mt-7 w-full`}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          下書きを作る
        </Button>
      </section>
    </div>
  );
}

function DraftReview({
  draft,
  sources,
  copied,
  isBusy,
  completionPending,
  publicationRequested,
  receiptOptIn,
  eventInvitationOptIn,
  userEmail,
  onReceiptChange,
  onEventInvitationChange,
  onDraftChange,
  onCopy,
  onPublicationChange,
  onComplete,
}: {
  draft: Draft;
  sources: readonly MinpakuSource[];
  copied: boolean;
  isBusy: boolean;
  completionPending: boolean;
  publicationRequested: boolean;
  receiptOptIn: boolean;
  eventInvitationOptIn: boolean;
  userEmail?: string;
  onReceiptChange: (value: boolean) => void;
  onEventInvitationChange: (value: boolean) => void;
  onDraftChange: (value: string) => void;
  onCopy: () => void;
  onPublicationChange: (value: boolean) => void;
  onComplete: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-layout-offset))] flex-col bg-mirai-light-gradient px-4 py-8">
      <section className="mx-auto w-full max-w-[720px] rounded-2xl bg-white p-6">
        <p className="text-sm font-bold text-primary">確認・編集</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-[22px] font-bold leading-[1.64] text-black outline-none"
        >
          あなたの言葉になっているか確認してください
        </h1>
        <p className="mt-3 text-[15px] leading-[1.87] text-black">
          AIが作った本文と、あなたが編集して保存する本文を分けて管理しています。提出前に必ず事実関係も確認してください。
        </p>

        <label
          htmlFor="public-comment-draft"
          className="mt-7 block text-sm font-bold text-black"
        >
          提出用に編集する本文
        </label>
        <textarea
          id="public-comment-draft"
          value={draft.final_body}
          disabled={isBusy || completionPending}
          onChange={(event) => onDraftChange(event.target.value)}
          rows={18}
          className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white p-4 text-[15px] leading-[1.87] text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />

        {draft.fact_check_notes.length > 0 && (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
            <p className="font-bold">確認が必要な箇所</p>
            <ul className="mt-1 list-disc pl-5">
              {draft.fact_check_notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-7 border-t border-gray-200 pt-6">
          <h2 className="text-base font-bold text-black">確認した資料</h2>
          <ul className="mt-3 space-y-2">
            {sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-4" />
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onCopy}
            className={`${OUTLINE_BUTTON_CLASS} w-full sm:w-auto`}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Clipboard className="size-4" />
            )}
            {copied ? "コピーしました" : "本文をコピー"}
          </Button>
          <a
            href={MINPAKU_OFFICIAL_SUBMISSION_URL}
            target="_blank"
            rel="noreferrer"
            className={`${OUTLINE_BUTTON_CLASS} w-full sm:w-auto`}
          >
            <ExternalLink className="size-4" />
            公式提出ページ
          </a>
        </div>

        <label className="mt-8 flex cursor-pointer items-start gap-3 border-t border-gray-200 pt-5 text-sm leading-7 text-black">
          <input
            type="checkbox"
            checked={publicationRequested}
            disabled={isBusy || completionPending}
            onChange={(event) => onPublicationChange(event.target.checked)}
            className="mt-1 size-4 shrink-0 rounded accent-primary"
          />
          <span>
            この最終コメントを匿名で公開し、運営の確認を受けることに同意します。公開前に人が確認し、会話全文や個人情報は公開しません。
          </span>
        </label>
        <div className="mt-5 border-t border-gray-200 pt-5">
          <ReceiptPreference
            checked={receiptOptIn}
            onChange={onReceiptChange}
            disabled={isBusy || completionPending}
            userEmail={userEmail}
          />
        </div>
        <div className="mt-5 border-t border-gray-200 pt-5">
          <EventInvitationPreference
            checked={eventInvitationOptIn}
            onChange={onEventInvitationChange}
            disabled={isBusy || completionPending}
            userEmail={userEmail}
          />
        </div>
        {completionPending && (
          <p className="mt-4 text-sm leading-7 text-mirai-text-secondary">
            完了処理を開始したため、本文と設定を固定しています。通信に失敗した場合は「確認して完了」で同じ内容の結果を再確認できます。
          </p>
        )}
        <Button
          type="button"
          onClick={onComplete}
          disabled={isBusy || !draft.final_body.trim()}
          className={`${PRIMARY_BUTTON_CLASS} mt-6 w-full`}
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          確認して完了
        </Button>
      </section>
    </div>
  );
}

function CompletePage({
  publicationRequested,
  receipt,
  eventInvitation,
  isBusy,
  onRetryReceipt,
  onRetryEventInvitation,
}: {
  publicationRequested: boolean;
  receipt: ReceiptResult | null;
  eventInvitation: PublicCommentEventInvitationResult | null;
  isBusy: boolean;
  onRetryReceipt: () => void;
  onRetryEventInvitation: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-layout-offset))] flex-col items-center bg-mirai-light-gradient px-4 py-8">
      <section className="w-full max-w-[560px] rounded-2xl bg-white p-6 sm:p-8">
        <Image
          src="/illustrations/interview-complete.svg"
          alt=""
          width={96}
          height={96}
          className="size-20"
        />
        <h1 className="mt-4 text-[22px] font-bold leading-[1.64] text-black">
          下書きを保存しました
        </h1>
        <p className="mt-4 text-[15px] leading-[1.87] text-black">
          公式提出ページを開き、本文を転記してください。氏名・住所などは、公式フォームの案内を確認して本人が入力します。
        </p>
        {publicationRequested && (
          <p className="mt-4 rounded-xl bg-mirai-light-gradient px-4 py-3 text-sm leading-7 text-black">
            匿名公開の申請は運営確認待ちです。承認されたコメントだけが公開一覧に表示されます。
          </p>
        )}
        {receipt && receipt.status !== "not_requested" && (
          <div className="mt-5 space-y-3 border-t border-gray-200 pt-5 text-sm leading-7">
            <p role="status" className="flex items-start gap-2">
              <Mail className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span>{RECEIPT_STATUS_MESSAGES[receipt.status]}</span>
            </p>
            {receipt.canRetry && (
              <p className="text-xs text-mirai-text-secondary">
                再試行しても状況が変わらない場合は、1〜2分待ってからお試しください。
              </p>
            )}
            {receipt.canRetry && (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={onRetryReceipt}
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                控えメールの送信を再試行
              </Button>
            )}
          </div>
        )}
        {eventInvitation && eventInvitation.status !== "not_requested" && (
          <div className="mt-5 space-y-3 border-t border-gray-200 pt-5 text-sm leading-7">
            <p role="status" className="flex items-start gap-2">
              <Mail className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span>
                {EVENT_INVITATION_STATUS_MESSAGES[eventInvitation.status]}
              </span>
            </p>
            {eventInvitation.canRetry && (
              <Button
                type="button"
                variant="outline"
                disabled={isBusy}
                onClick={onRetryEventInvitation}
              >
                {isBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                イベント案内メールの送信を再試行
              </Button>
            )}
          </div>
        )}
        <a
          href={MINPAKU_OFFICIAL_SUBMISSION_URL}
          target="_blank"
          rel="noreferrer"
          className={`${PRIMARY_BUTTON_CLASS} mt-7 w-full`}
        >
          <ExternalLink className="size-4" />
          公式提出ページを開く
        </a>
      </section>
    </div>
  );
}

export function PublicCommentMinpakuPage() {
  const auth = useChatAuth();
  const [view, setView] = useState<View>("intro");
  const containerRef = useRef<HTMLDivElement>(null);
  usePublicCommentViewScroll(view, containerRef);
  const [consentOpen, setConsentOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedOrdinances, setSelectedOrdinances] = useState<string[]>([
    ...MINPAKU_ORDINANCES,
  ]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sources, setSources] =
    useState<readonly MinpakuSource[]>(MINPAKU_SOURCES);
  const [publicationRequested, setPublicationRequested] = useState(false);
  const [receiptOptIn, setReceiptOptIn] = useState(true);
  const [eventInvitationOptIn, setEventInvitationOptIn] = useState(true);
  const [draftGenerationStatus, setDraftGenerationStatus] =
    useState<DraftGenerationStatus>("generating");
  const [receipt, setReceipt] = useState<ReceiptResult | null>(null);
  const [eventInvitation, setEventInvitation] =
    useState<PublicCommentEventInvitationResult | null>(null);
  const [completionPending, setCompletionPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [authReturnError, setAuthReturnError] = useState<string>();
  const {
    messages,
    answer,
    setAnswer,
    quickReplies,
    progress,
    mode,
    loadConversation,
    sendAnswer,
    chooseCheckpoint,
  } = useInterviewConversation({
    sessionId,
    apiBasePath: "/api/public-comment/minpaku",
    busy,
    setBusy,
    setError,
    onDone: () => setView("ordinances"),
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const returningFromAuth = url.searchParams.get("auth_return") === "1";
    if (returningFromAuth) {
      setReceiptOptIn(url.searchParams.get("receipt") === "1");
      setEventInvitationOptIn(url.searchParams.get("event") !== "0");
      const returnedSession = url.searchParams.get("session");
      const returnedTargets = url.searchParams.get("targets");
      if (returnedSession) {
        setSessionId(returnedSession);
        setView("auth");
      }
      if (returnedTargets) {
        try {
          const parsed = JSON.parse(returnedTargets);
          if (Array.isArray(parsed)) setSelectedOrdinances(parsed);
        } catch {
          // The default two ordinances remain selected.
        }
      }
      url.searchParams.delete("auth_return");
      url.searchParams.delete("receipt");
      url.searchParams.delete("event");
      url.searchParams.delete("session");
      url.searchParams.delete("targets");
      window.history.replaceState(window.history.state, "", url);
    }
    const authError = url.searchParams.get("auth_error");
    if (authError) {
      setAuthReturnError(
        authError === "handoff_failed"
          ? "ログイン後のインタビュー引き継ぎに失敗しました。もう一度お試しください。"
          : "Googleログインが完了しませんでした。もう一度お試しください。"
      );
      url.searchParams.delete("auth_error");
      window.history.replaceState(window.history.state, "", url);
    }
    try {
      if (sessionStorage.getItem(PUBLIC_COMMENT_AUTH_RETURN_KEY) === "1") {
        sessionStorage.removeItem(PUBLIC_COMMENT_AUTH_RETURN_KEY);
        const savedReceipt = sessionStorage.getItem(
          PUBLIC_COMMENT_AUTH_RECEIPT_KEY
        );
        sessionStorage.removeItem(PUBLIC_COMMENT_AUTH_RECEIPT_KEY);
        if (!returningFromAuth && savedReceipt === "false")
          setReceiptOptIn(false);
        const savedEvent = sessionStorage.getItem(
          `${PUBLIC_COMMENT_AUTH_RETURN_KEY}-event`
        );
        sessionStorage.removeItem(`${PUBLIC_COMMENT_AUTH_RETURN_KEY}-event`);
        if (!returningFromAuth && savedEvent === "false")
          setEventInvitationOptIn(false);
        const savedSession = sessionStorage.getItem(
          `${PUBLIC_COMMENT_AUTH_RETURN_KEY}-session`
        );
        const savedTargets = sessionStorage.getItem(
          `${PUBLIC_COMMENT_AUTH_RETURN_KEY}-targets`
        );
        sessionStorage.removeItem(`${PUBLIC_COMMENT_AUTH_RETURN_KEY}-session`);
        sessionStorage.removeItem(`${PUBLIC_COMMENT_AUTH_RETURN_KEY}-targets`);
        if (!returningFromAuth && savedSession) {
          setSessionId(savedSession);
          setView("auth");
        }
        if (!returningFromAuth && savedTargets) {
          try {
            const parsed = JSON.parse(savedTargets);
            if (Array.isArray(parsed)) setSelectedOrdinances(parsed);
          } catch {
            // The default two ordinances remain selected.
          }
        }
      }
    } catch {
      // Storage may be unavailable; the normal start button remains usable.
    }
  }, []);

  const signIn = async () => {
    if (!sessionId || busy) return;
    setAuthReturnError(undefined);
    setBusy(true);
    const prepareResponse = await fetch("/api/public-comment/auth/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const prepareData = await prepareResponse.json().catch(() => null);
    if (!prepareResponse.ok) {
      setBusy(false);
      setAuthReturnError(
        prepareData?.error ?? "ログインの準備に失敗しました。"
      );
      return;
    }
    try {
      sessionStorage.setItem(PUBLIC_COMMENT_AUTH_RETURN_KEY, "1");
      sessionStorage.setItem(
        PUBLIC_COMMENT_AUTH_RECEIPT_KEY,
        String(receiptOptIn)
      );
      sessionStorage.setItem(
        `${PUBLIC_COMMENT_AUTH_RETURN_KEY}-event`,
        String(eventInvitationOptIn)
      );
      sessionStorage.setItem(
        `${PUBLIC_COMMENT_AUTH_RETURN_KEY}-session`,
        sessionId
      );
      sessionStorage.setItem(
        `${PUBLIC_COMMENT_AUTH_RETURN_KEY}-targets`,
        JSON.stringify(selectedOrdinances)
      );
    } catch {
      // Do not block authentication when browser storage is unavailable.
    }
    const params = new URLSearchParams({
      auth_return: "1",
      receipt: receiptOptIn ? "1" : "0",
      event: eventInvitationOptIn ? "1" : "0",
      session: sessionId,
      targets: JSON.stringify(selectedOrdinances),
    });
    await auth.signInWithGoogle(`${routes.publicCommentMinpaku()}?${params}`);
    setBusy(false);
  };

  const startSession = useCallback(async () => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      await ensurePublicCommentActor();
      const response = await fetch("/api/public-comment/minpaku/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consented: true,
          receiptOptIn: false,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "開始できませんでした");
      setSessionId(data.sessionId);
      setReceiptOptIn(true);
      setEventInvitationOptIn(true);
      setEventInvitation(null);
      loadConversation(data);
      if (data.draft) setDraft(data.draft);
      if (data.sources) setSources(data.sources);
      if (data.nextStage === "review" && data.draft) setView("review");
      else if (
        data.nextStage === "draft" &&
        ["generating", "ready", "failed"].includes(data.draftGenerationStatus)
      ) {
        setDraftGenerationStatus(
          data.draftGenerationStatus === "failed"
            ? "failed"
            : data.draftGenerationStatus === "ready"
              ? "ready"
              : "generating"
        );
        setView("auth");
      } else setView(data.nextStage === "draft" ? "ordinances" : "interview");
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "開始できませんでした"
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, loadConversation]);

  const generateDraft = useCallback(async () => {
    if (!sessionId || selectedOrdinances.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/public-comment/minpaku/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          targetOrdinances: selectedOrdinances,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "下書きを作成できませんでした");
      if (data.draft) {
        setDraft(data.draft);
        setSources(data.sources ?? MINPAKU_SOURCES);
        setView("review");
      } else {
        setDraftGenerationStatus(
          data.status === "ready" ? "ready" : "generating"
        );
        setView("auth");
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "下書きを作成できませんでした"
      );
    } finally {
      setBusy(false);
    }
  }, [busy, selectedOrdinances, sessionId]);

  useEffect(() => {
    if (view !== "auth" || !sessionId || selectedOrdinances.length === 0)
      return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch("/api/public-comment/minpaku/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            targetOrdinances: selectedOrdinances,
          }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "下書きを確認できませんでした");
        if (cancelled) return;
        if (data.draft) {
          setDraft(data.draft);
          setSources(data.sources ?? MINPAKU_SOURCES);
          setError(null);
          setView("review");
          return;
        }
        setDraftGenerationStatus(
          data.status === "ready" ? "ready" : "generating"
        );
        if (data.status === "ready" && auth.status !== "authenticated") return;
        timeoutId = setTimeout(poll, 2000);
      } catch (caught) {
        if (cancelled) return;
        setDraftGenerationStatus("failed");
        setError(
          caught instanceof Error
            ? caught.message
            : "下書きを確認できませんでした"
        );
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [auth.status, selectedOrdinances, sessionId, view]);

  const complete = useCallback(async () => {
    if (!sessionId || !draft || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!completionPending) {
        const updateResponse = await fetch(
          "/api/public-comment/minpaku/draft",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              finalBody: draft.final_body,
              targetOrdinances: draft.target_ordinances,
            }),
          }
        );
        const updateData = await updateResponse.json();
        if (!updateResponse.ok)
          throw new Error(updateData.error ?? "下書きを保存できませんでした");
        setDraft(updateData.draft);
        setCompletionPending(true);
      }

      const response = await fetch("/api/public-comment/minpaku/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          publicationRequested,
          receiptOptIn,
          eventInvitationOptIn,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "完了できませんでした");
      setReceipt(data.receipt);
      setEventInvitation(data.eventInvitation ?? null);
      setPublicationRequested(data.status === "pending_review");
      setView("complete");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "完了できませんでした"
      );
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    completionPending,
    draft,
    publicationRequested,
    eventInvitationOptIn,
    receiptOptIn,
    sessionId,
  ]);

  const retryReceipt = async () => {
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/public-comment/minpaku/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setReceipt(data.receipt);
    } catch {
      setError(
        "送信状況を確認できませんでした。しばらくしてからお試しください。"
      );
    } finally {
      setBusy(false);
    }
  };

  const retryEventInvitation = async () => {
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/public-comment/minpaku/event-invitation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "イベント案内メールを再試行できませんでした"
        );
      setEventInvitation(data.eventInvitation);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "イベント案内メールを再試行できませんでした"
      );
    } finally {
      setBusy(false);
    }
  };

  const copyDraft = useCallback(async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.final_body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [draft]);

  const handleStartClick = () => {
    setError(null);
    setConsentOpen(true);
  };

  const handleConsent = () => {
    void startSession().then((started) => {
      if (started) setConsentOpen(false);
    });
  };

  if (view === "interview") {
    return (
      <div ref={containerRef}>
        <PublicCommentInterviewChat
          messages={messages}
          progress={progress}
          mode={mode}
          onAction={(action) => void sendAnswer("", action)}
          onCheckpointChoice={(choice) => void chooseCheckpoint(choice)}
          quickReplies={quickReplies}
          isLoading={busy}
          error={error}
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={(message: PromptInputMessage) =>
            void sendAnswer(message.text)
          }
          onQuickReply={(reply) => void sendAnswer(reply)}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {view === "intro" && (
        <PublicCommentIntro
          onStart={handleStartClick}
          onLearn={() => setView("learning")}
          onViewComments={() => {
            window.location.href = routes.publicCommentMinpakuComments();
          }}
        />
      )}
      {view === "learning" && (
        <PublicCommentLearning
          onStartInterview={handleStartClick}
          onBack={() => setView("intro")}
        />
      )}
      {view === "ordinances" && (
        <OrdinanceSelection
          selectedOrdinances={selectedOrdinances}
          isBusy={busy}
          onToggle={(ordinance) =>
            setSelectedOrdinances((current) =>
              current.includes(ordinance)
                ? current.filter((item) => item !== ordinance)
                : [...current, ordinance]
            )
          }
          onGenerate={() => void generateDraft()}
        />
      )}
      {view === "auth" && (
        <PublicCommentDraftAuthGate
          status={draftGenerationStatus}
          authStatus={auth.status}
          userEmail={auth.userEmail}
          receiptOptIn={receiptOptIn}
          eventInvitationOptIn={eventInvitationOptIn}
          isBusy={busy}
          error={auth.error ?? authReturnError ?? error}
          onReceiptChange={setReceiptOptIn}
          onEventInvitationChange={setEventInvitationOptIn}
          onSignIn={() => void signIn()}
          onRetry={() => void generateDraft()}
        />
      )}
      {view === "review" && draft && (
        <DraftReview
          draft={draft}
          sources={sources}
          copied={copied}
          isBusy={busy}
          publicationRequested={publicationRequested}
          completionPending={completionPending}
          receiptOptIn={receiptOptIn}
          eventInvitationOptIn={eventInvitationOptIn}
          userEmail={auth.userEmail}
          onReceiptChange={setReceiptOptIn}
          onEventInvitationChange={setEventInvitationOptIn}
          onDraftChange={(value) => setDraft({ ...draft, final_body: value })}
          onCopy={() => void copyDraft()}
          onPublicationChange={setPublicationRequested}
          onComplete={() => void complete()}
        />
      )}
      {view === "complete" && (
        <CompletePage
          publicationRequested={publicationRequested}
          receipt={receipt}
          eventInvitation={eventInvitation}
          isBusy={busy}
          onRetryReceipt={() => void retryReceipt()}
          onRetryEventInvitation={() => void retryEventInvitation()}
        />
      )}

      {error && (
        <div
          className="fixed inset-x-4 bottom-[var(--mobile-primary-navigation-layout-offset)] z-50 mx-auto max-w-[560px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg pc:bottom-4"
          role="alert"
        >
          {error}
        </div>
      )}

      <PublicCommentConsentModal
        open={consentOpen}
        onOpenChange={setConsentOpen}
        isStarting={busy}
        onAgree={handleConsent}
      />
    </div>
  );
}
