"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { useChatAuth } from "@/features/chat/client/hooks/use-chat-auth";
import { PublicCommentConsentModal } from "@/features/public-comment/minpaku/client/public-comment-consent-modal";
import { usePublicCommentViewScroll } from "@/features/public-comment/minpaku/client/use-public-comment-view-scroll";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "@/features/public-comment/minpaku/shared/consent";
import { PublicCommentInterviewChat } from "./public-comment-interview-chat";
import {
  type LearningLesson,
  type LearningSource,
  PublicCommentLearning,
} from "./public-comment-learning";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  question_id?: string | null;
};

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
  | "ready"
  | "review"
  | "complete";

export type PublicCommentPageConfig = {
  campaignTitle: string;
  submissionDeadline: string;
  officialSubmissionUrl: string;
  sources: readonly LearningSource[];
  sourcesSummary: string;
  lessons: readonly LearningLesson[];
  learningReviewedAt: string;
  learningEstimatedTime: string;
  learningTitle?: string;
  learningSubtitle?: string;
  learningNote?: string;
  targetDocumentLabel?: string;
  questions: readonly { id: string; topic: string }[];
  themes: readonly string[];
  audienceLabel: string;
  safetyContent: React.ReactNode;
  authReturnKey: string;
  routePath: string;
  apiBasePath: string;
  screenReaderTitle: string;
  privacyNotice: string;
  draftTextareaId: string;
};

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[100px] bg-primary-strong px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const OUTLINE_BUTTON_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[100px] border border-black px-6 text-[15px] font-bold text-black transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50";

function formatDeadline(deadline: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(deadline));
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
      <div className="text-[15px] leading-[1.87] text-black">{children}</div>
    </section>
  );
}

function StartActions({
  onStart,
  onLearn,
  lessonCount,
  learningEstimatedTime,
  targetDocumentLabel,
}: {
  onStart: () => void;
  onLearn: () => void;
  lessonCount: number;
  learningEstimatedTime: string;
  targetDocumentLabel: string;
}) {
  return (
    <div className="flex w-full max-w-[370px] flex-col items-center gap-3">
      <Button
        type="button"
        onClick={onLearn}
        className="h-auto min-h-13 w-full whitespace-normal py-3 text-[15px]"
      >
        <BookOpen className="size-5" />
        {targetDocumentLabel}について学ぶ
        <ArrowRight className="size-4" />
      </Button>
      <p className="text-xs text-mirai-text-secondary">
        {lessonCount}章・各1問 / 目安{learningEstimatedTime}
      </p>
      <Button
        type="button"
        variant="link"
        onClick={onStart}
        className="whitespace-normal text-sm leading-6 text-primary-strong"
      >
        すぐにAIインタビューをはじめる
      </Button>
    </div>
  );
}

function PublicCommentIntro({
  onStart,
  onLearn,
  config,
}: {
  onStart: () => void;
  onLearn: () => void;
  config: PublicCommentPageConfig;
}) {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="flex h-56 items-center justify-center bg-mirai-light-gradient md:h-72">
        <Image
          src="/illustrations/interview-illustration.png"
          alt="話を丁寧に聴く人のイラスト"
          width={580}
          height={745}
          priority
          className="h-48 w-auto object-contain md:h-64"
        />
      </div>
      <div className="flex flex-col items-center gap-8 px-4">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="inline-flex items-center rounded-2xl bg-primary-strong px-6 py-1 text-[13px] font-medium text-white">
            {config.audienceLabel}
          </div>
          <h1 className="text-2xl font-bold leading-[1.5]">
            パブリックコメントをつくるAIインタビュー
          </h1>
          <p className="max-w-[560px] rounded-xl bg-white px-4 py-3 text-[13px] font-medium leading-6">
            {config.campaignTitle}
          </p>
          <StartActions
            onStart={onStart}
            onLearn={onLearn}
            lessonCount={config.lessons.length}
            learningEstimatedTime={config.learningEstimatedTime}
            targetDocumentLabel={config.targetDocumentLabel ?? "条例素案"}
          />
        </div>

        <IntroSection title="このインタビューでできること">
          <div className="space-y-4">
            <p>
              世田谷区が意見を募集している
              {config.targetDocumentLabel ?? "条例素案"}
              について、AIが一度に1つずつ質問し、あなたが大切にしたいことを整理します。
            </p>
            <p>
              最後に、意見の要旨、理由、具体的な提案を分けた下書きを作ります。AIが賛成・反対を決めたり、あなたが話していない主張を足したりはしません。
            </p>
            <p>
              意見募集の期限は
              <strong className="font-bold text-primary-strong">
                {formatDeadline(config.submissionDeadline)}
              </strong>
              です。
            </p>
          </div>
        </IntroSection>

        <IntroSection title="質問テーマ">
          <ol className="space-y-3">
            {config.themes.map((theme, index) => (
              <li key={theme} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-strong text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span>{theme}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[13px] leading-6 text-mirai-text-secondary">
            目安は10〜15分です。答えたくないことは書かなくて大丈夫です。
          </p>
        </IntroSection>

        <section className="mx-auto w-full max-w-[560px] rounded-2xl border border-primary bg-white p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-6 shrink-0 text-primary-strong" />
            <div className="space-y-3 text-[13px] leading-6 text-black">
              <h2 className="text-lg font-bold">安全とプライバシーについて</h2>
              {config.safetyContent}
            </div>
          </div>
        </section>

        <IntroSection title="確認した資料">
          <p>{config.sourcesSummary}</p>
          <ul className="mt-4 space-y-3">
            {config.sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-start gap-2 text-sm font-bold leading-6 text-primary-strong underline-offset-4 hover:underline"
                >
                  <ExternalLink className="mt-1 size-4 shrink-0" />
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </IntroSection>

        <IntroSection title="利用上の注意">
          <div className="space-y-3 text-[13px] leading-6">
            <p>
              AIインタビューにはGoogleログインが必要です。同意後の回答は、下書き作成のためアカウントにひも付けて保存します。
            </p>
            <p>
              このテーマでは、会話や下書きの匿名公開と、会話全文のメール送信は行いません。公式ページへの提出も自動では行われません。
            </p>
            <p>
              AIが作った下書きは、事実関係と自分の言葉になっているかを必ず確認・編集してから、本人が公式フォームへ転記してください。
            </p>
          </div>
        </IntroSection>

        <StartActions
          onStart={onStart}
          onLearn={onLearn}
          lessonCount={config.lessons.length}
          learningEstimatedTime={config.learningEstimatedTime}
          targetDocumentLabel={config.targetDocumentLabel ?? "条例素案"}
        />
      </div>
    </div>
  );
}

function DraftReady({
  isBusy,
  onGenerate,
}: {
  isBusy: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="min-h-[calc(100dvh-var(--app-header-layout-offset))] bg-mirai-light-gradient px-4 py-8">
      <section className="mx-auto w-full max-w-[560px] rounded-2xl bg-white p-6">
        <p className="text-sm font-bold text-primary-strong">
          インタビュー完了
        </p>
        <h1 className="mt-2 text-[22px] font-bold leading-[1.64]">
          あなたの回答から下書きを作ります
        </h1>
        <p className="mt-3 text-[15px] leading-7">
          AIは新しい主張を足さず、意見の要旨、理由、具体的な提案に整理します。作成後に全文を編集できます。
        </p>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={isBusy}
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
  onDraftChange,
  onCopy,
  onComplete,
  officialSubmissionUrl,
  draftTextareaId,
}: {
  draft: Draft;
  sources: readonly LearningSource[];
  copied: boolean;
  isBusy: boolean;
  completionPending: boolean;
  onDraftChange: (value: string) => void;
  onCopy: () => void;
  onComplete: () => void;
  officialSubmissionUrl: string;
  draftTextareaId: string;
}) {
  return (
    <div className="min-h-[calc(100dvh-var(--app-header-layout-offset))] bg-mirai-light-gradient px-4 py-8">
      <section className="mx-auto w-full max-w-[720px] rounded-2xl bg-white p-6">
        <p className="text-sm font-bold text-primary-strong">確認・編集</p>
        <h1 className="mt-2 text-[22px] font-bold leading-[1.64]">
          あなたの言葉になっているか確認してください
        </h1>
        <p className="mt-3 text-[15px] leading-7">
          個別の出来事が推測できる情報、事実と違う内容、言っていない主張がないか確認してください。本文は自由に直せます。
        </p>
        <label
          htmlFor={draftTextareaId}
          className="mt-7 block text-sm font-bold"
        >
          提出用に編集する本文
        </label>
        <textarea
          id={draftTextareaId}
          value={draft.final_body}
          disabled={isBusy || completionPending}
          onChange={(event) => onDraftChange(event.target.value)}
          rows={20}
          className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-white p-4 text-[15px] leading-7 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {draft.fact_check_notes.length > 0 && (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
            <p className="font-bold">提出前に確認すること</p>
            <ul className="mt-1 list-disc pl-5">
              {draft.fact_check_notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-7 border-t border-gray-200 pt-6">
          <h2 className="text-base font-bold">参照資料</h2>
          <ul className="mt-3 space-y-2">
            {sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary-strong underline-offset-4 hover:underline"
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
            className={OUTLINE_BUTTON_CLASS}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Clipboard className="size-4" />
            )}
            {copied ? "コピーしました" : "本文をコピー"}
          </Button>
          <a
            href={officialSubmissionUrl}
            target="_blank"
            rel="noreferrer"
            className={OUTLINE_BUTTON_CLASS}
          >
            <ExternalLink className="size-4" />
            公式提出ページ
          </a>
        </div>
        <p className="mt-6 border-t border-gray-200 pt-5 text-sm leading-7 text-mirai-text-secondary">
          完了すると本文を固定します。このサイトから区への提出や一般公開は行いません。
        </p>
        {completionPending && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
            下書きは保存済みです。通信が途中で切れた場合は、本文を変更せずに完了処理だけを再試行します。
          </p>
        )}
        <Button
          type="button"
          onClick={onComplete}
          disabled={isBusy || !draft.final_body.trim()}
          className={`${PRIMARY_BUTTON_CLASS} mt-5 w-full`}
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
  copied,
  onCopy,
  officialSubmissionUrl,
}: {
  copied: boolean;
  onCopy: () => void;
  officialSubmissionUrl: string;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-layout-offset))] items-start justify-center bg-mirai-light-gradient px-4 py-8">
      <section className="w-full max-w-[560px] rounded-2xl bg-white p-6 sm:p-8">
        <Image
          src="/illustrations/interview-complete.svg"
          alt=""
          width={96}
          height={96}
          className="size-20"
        />
        <h1 className="mt-4 text-[22px] font-bold leading-[1.64]">
          下書きを保存しました
        </h1>
        <p className="mt-4 text-[15px] leading-7">
          公式提出ページを開き、確認済みの本文を転記してください。氏名、住所または勤務先・通学先など、公式フォームで必要な情報は本人が入力します。
        </p>
        <p className="mt-4 text-sm leading-7 text-mirai-text-secondary">
          このサイトから世田谷区へは自動提出されていません。会話や下書きも一般公開されません。
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={onCopy}
          className={`${OUTLINE_BUTTON_CLASS} mt-7 w-full`}
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Clipboard className="size-4" />
          )}
          {copied ? "コピーしました" : "提出用の本文をコピー"}
        </Button>
        <a
          href={officialSubmissionUrl}
          target="_blank"
          rel="noreferrer"
          className={`${PRIMARY_BUTTON_CLASS} mt-3 w-full`}
        >
          <ExternalLink className="size-4" />
          公式提出ページを開く
        </a>
      </section>
    </div>
  );
}

export function PublicCommentCampaignPage({
  config,
}: {
  config: PublicCommentPageConfig;
}) {
  const auth = useChatAuth();
  const [view, setView] = useState<View>("intro");
  const containerRef = useRef<HTMLDivElement>(null);
  usePublicCommentViewScroll(view, containerRef);
  const [consentOpen, setConsentOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sources, setSources] = useState<readonly LearningSource[]>(
    config.sources
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [completionPending, setCompletionPending] = useState(false);
  const [authReturnError, setAuthReturnError] = useState<string>();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("auth_return") === "1") {
      setConsentOpen(true);
      url.searchParams.delete("auth_return");
      window.history.replaceState(window.history.state, "", url);
    }
    if (url.searchParams.get("auth_error") === "google_login_failed") {
      setAuthReturnError(
        "Googleログインが完了しませんでした。もう一度お試しください。"
      );
      setConsentOpen(true);
      url.searchParams.delete("auth_error");
      window.history.replaceState(window.history.state, "", url);
    }
    try {
      if (sessionStorage.getItem(config.authReturnKey) === "1") {
        sessionStorage.removeItem(config.authReturnKey);
        setConsentOpen(true);
      }
    } catch {
      // Storage may be unavailable; the normal start button remains usable.
    }
  }, [config.authReturnKey]);

  const signIn = async () => {
    setAuthReturnError(undefined);
    try {
      sessionStorage.setItem(config.authReturnKey, "1");
    } catch {
      // Authentication can continue without browser storage.
    }
    await auth.signInWithGoogle(`${config.routePath}?auth_return=1`);
  };

  const startSession = useCallback(async () => {
    if (auth.status !== "authenticated" || busy) return false;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${config.apiBasePath}/session`, {
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
      setMessages(
        (data.messages ?? []).map(
          (message: Omit<Message, "id"> & { id?: string }) => ({
            ...message,
            id: message.id ?? crypto.randomUUID(),
          })
        )
      );
      setQuickReplies(data.quickReplies ?? []);
      if (data.draft) setDraft(data.draft);
      if (data.sources) setSources(data.sources);
      if (data.nextStage === "review") {
        setView("review");
      } else {
        setInterviewComplete(data.nextStage === "draft");
        setView("interview");
      }
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "開始できませんでした"
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [auth.status, busy, config.apiBasePath]);

  const sendAnswer = useCallback(
    async (value = answer) => {
      const content = value.trim();
      if (!sessionId || !content || busy) return;
      setBusy(true);
      setError(null);
      setAnswer("");
      setQuickReplies([]);
      const optimisticMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      setMessages((current) => [...current, optimisticMessage]);
      try {
        const response = await fetch(`${config.apiBasePath}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, content }),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "回答を送信できませんでした");
        setMessages((current) => [
          ...current,
          { ...data.message, id: data.message.id ?? crypto.randomUUID() },
        ]);
        setQuickReplies(data.quickReplies ?? []);
        if (data.nextStage === "draft") setInterviewComplete(true);
      } catch (caught) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimisticMessage.id)
        );
        setAnswer(content);
        setError(
          caught instanceof Error
            ? caught.message
            : "回答を送信できませんでした"
        );
      } finally {
        setBusy(false);
      }
    },
    [answer, busy, config.apiBasePath, sessionId]
  );

  const generateDraft = useCallback(async () => {
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${config.apiBasePath}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "下書きを作成できませんでした");
      setDraft(data.draft);
      setSources(data.sources ?? config.sources);
      setView("review");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "下書きを作成できませんでした"
      );
    } finally {
      setBusy(false);
    }
  }, [busy, config.apiBasePath, config.sources, sessionId]);

  const complete = useCallback(async () => {
    if (!sessionId || !draft || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!completionPending) {
        const updateResponse = await fetch(`${config.apiBasePath}/draft`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, finalBody: draft.final_body }),
        });
        const updateData = await updateResponse.json();
        if (!updateResponse.ok)
          throw new Error(updateData.error ?? "下書きを保存できませんでした");
        setDraft(updateData.draft);
        setCompletionPending(true);
      }

      const response = await fetch(`${config.apiBasePath}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          publicationRequested: false,
          receiptOptIn: false,
          consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "完了できませんでした");
      setView("complete");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "完了できませんでした"
      );
    } finally {
      setBusy(false);
    }
  }, [busy, completionPending, config.apiBasePath, draft, sessionId]);

  const copyDraft = useCallback(async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.final_body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        "本文をコピーできませんでした。ブラウザのクリップボード権限を確認して、もう一度お試しください。"
      );
    }
  }, [draft]);

  const handleStartClick = () => {
    setError(null);
    setConsentOpen(true);
  };

  if (view === "interview") {
    return (
      <div ref={containerRef}>
        <PublicCommentInterviewChat
          messages={messages}
          quickReplies={quickReplies}
          isLoading={busy}
          error={error}
          answer={answer}
          isComplete={interviewComplete}
          onAnswerChange={setAnswer}
          onSubmit={(message: PromptInputMessage) =>
            void sendAnswer(message.text)
          }
          onQuickReply={(reply) => void sendAnswer(reply)}
          onContinueToDraft={() => setView("ready")}
          questions={config.questions}
          screenReaderTitle={config.screenReaderTitle}
          privacyNotice={config.privacyNotice}
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
          config={config}
        />
      )}
      {view === "learning" && (
        <PublicCommentLearning
          onStartInterview={handleStartClick}
          onBack={() => setView("intro")}
          sources={config.sources}
          lessons={config.lessons}
          reviewedAt={config.learningReviewedAt}
          courseTitle={config.learningTitle}
          courseSubtitle={config.learningSubtitle}
          courseNote={config.learningNote}
        />
      )}
      {view === "ready" && (
        <DraftReady isBusy={busy} onGenerate={() => void generateDraft()} />
      )}
      {view === "review" && draft && (
        <DraftReview
          draft={draft}
          sources={sources}
          copied={copied}
          isBusy={busy}
          completionPending={completionPending}
          onDraftChange={(value) => setDraft({ ...draft, final_body: value })}
          onCopy={() => void copyDraft()}
          onComplete={() => void complete()}
          officialSubmissionUrl={config.officialSubmissionUrl}
          draftTextareaId={config.draftTextareaId}
        />
      )}
      {view === "complete" && (
        <CompletePage
          copied={copied}
          onCopy={() => void copyDraft()}
          officialSubmissionUrl={config.officialSubmissionUrl}
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
        onAgree={() => {
          void startSession().then((started) => {
            if (started) setConsentOpen(false);
          });
        }}
        authStatus={auth.status}
        userEmail={auth.userEmail}
        authError={auth.error ?? authReturnError}
        initialReceiptOptIn={false}
        receiptEnabled={false}
        onSignIn={signIn}
      />
    </div>
  );
}
