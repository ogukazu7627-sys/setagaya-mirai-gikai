"use client";

import {
  ArrowRight,
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { useAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";
import { routes } from "@/lib/routes";
import {
  MINPAKU_CAMPAIGN_TITLE,
  MINPAKU_OFFICIAL_SUBMISSION_URL,
  MINPAKU_ORDINANCES,
  MINPAKU_SOURCES,
  MINPAKU_SUBMISSION_DEADLINE,
  type MinpakuSource,
} from "../shared/campaign";
import { PublicCommentConsentModal } from "./public-comment-consent-modal";
import { PublicCommentInterviewChat } from "./public-comment-interview-chat";

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

type View = "intro" | "interview" | "ordinances" | "review" | "complete";

const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[100px] bg-primary px-6 text-[15px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const OUTLINE_BUTTON_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[100px] border border-black px-6 text-[15px] font-bold text-black transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50";

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
    text: "7つの質問テーマから、伝えたいことを整理します",
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
        src="/illustrations/interview-illustration.png"
        alt="AIインタビュー"
        fill
        priority
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 768px"
      />
    </div>
  );
}

function PublicCommentHero({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="mb-3 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-1">
          <span className="text-[13px] font-medium leading-tight text-white">
            世田谷区への意見を考えている方へ
          </span>
        </div>
        <h1 className="text-center text-2xl font-bold leading-[1.5]">
          パブリックコメントをつくるAIインタビュー
        </h1>
        <div className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-2">
          <span className="text-center text-[13px] font-medium leading-[1.87] text-black">
            {MINPAKU_CAMPAIGN_TITLE}
          </span>
        </div>
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

      <Button
        type="button"
        onClick={onStart}
        className="mt-2 h-12 w-full max-w-[370px] rounded-[100px] bg-mirai-gradient px-6 text-[15px] font-bold text-black hover:opacity-90"
      >
        <Image
          src="/icons/messages-square-icon.svg"
          alt=""
          width={24}
          height={24}
        />
        AIインタビューをはじめる
        <ArrowRight className="size-4" />
      </Button>
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
  onViewComments,
}: {
  onStart: () => void;
  onViewComments: () => void;
}) {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <PublicCommentHeader />
      <div className="flex flex-col items-center gap-8 px-4">
        <PublicCommentHero onStart={onStart} />

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

        <IntroSection title="予定時間">
          <p className="text-[22px] font-bold leading-[1.64] text-primary-accent">
            10〜15分程度
          </p>
          <p className="mt-2 text-[13px] leading-[1.69]">
            回答の長さや、追加の質問によって前後します。
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

        <IntroSection title="確認できる公式資料">
          <div className="space-y-4">
            <p>
              インタビューでは、世田谷区の意見募集ページ、区の考え、改正素案概要、新旧対照表を前提にします。
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
          <Button
            type="button"
            onClick={onStart}
            className={PRIMARY_BUTTON_CLASS}
          >
            <Image
              src="/icons/messages-square-icon.svg"
              alt=""
              width={24}
              height={24}
            />
            AIインタビューをはじめる
            <ArrowRight className="size-4" />
          </Button>
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
  publicationRequested,
  onDraftChange,
  onCopy,
  onPublicationChange,
  onComplete,
}: {
  draft: Draft;
  sources: readonly MinpakuSource[];
  copied: boolean;
  isBusy: boolean;
  publicationRequested: boolean;
  onDraftChange: (value: string) => void;
  onCopy: () => void;
  onPublicationChange: (value: boolean) => void;
  onComplete: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--app-header-layout-offset))] flex-col bg-mirai-light-gradient px-4 py-8">
      <section className="mx-auto w-full max-w-[720px] rounded-2xl bg-white p-6">
        <p className="text-sm font-bold text-primary">確認・編集</p>
        <h1 className="mt-2 text-[22px] font-bold leading-[1.64] text-black">
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
            onChange={(event) => onPublicationChange(event.target.checked)}
            className="mt-1 size-4 shrink-0 rounded accent-primary"
          />
          <span>
            この最終コメントを匿名で公開し、運営の確認を受けることに同意します。公開前に人が確認し、会話全文や個人情報は公開しません。
          </span>
        </label>
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
}: {
  publicationRequested: boolean;
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
  const userId = useAnonymousSupabaseUser();
  const [view, setView] = useState<View>("intro");
  const [consentOpen, setConsentOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [selectedOrdinances, setSelectedOrdinances] = useState<string[]>([
    ...MINPAKU_ORDINANCES,
  ]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sources, setSources] =
    useState<readonly MinpakuSource[]>(MINPAKU_SOURCES);
  const [publicationRequested, setPublicationRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const startSession = useCallback(async () => {
    if (!userId || busy) return false;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/public-comment/minpaku/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented: true }),
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
      setView("interview");
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "開始できませんでした"
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [busy, userId]);

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
        const response = await fetch("/api/public-comment/minpaku/chat", {
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
        if (data.nextStage === "draft") setView("ordinances");
      } catch (caught) {
        setMessages((current) =>
          current.filter((message) => message.id !== optimisticMessage.id)
        );
        setError(
          caught instanceof Error
            ? caught.message
            : "回答を送信できませんでした"
        );
      } finally {
        setBusy(false);
      }
    },
    [answer, busy, sessionId]
  );

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
      setDraft(data.draft);
      setSources(data.sources ?? MINPAKU_SOURCES);
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
  }, [busy, selectedOrdinances, sessionId]);

  const complete = useCallback(async () => {
    if (!sessionId || !draft || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updateResponse = await fetch("/api/public-comment/minpaku/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          finalBody: draft.final_body,
          targetOrdinances: draft.target_ordinances,
        }),
      });
      const updateData = await updateResponse.json();
      if (!updateResponse.ok)
        throw new Error(updateData.error ?? "下書きを保存できませんでした");
      setDraft(updateData.draft);

      const response = await fetch("/api/public-comment/minpaku/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, publicationRequested }),
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
  }, [busy, draft, publicationRequested, sessionId]);

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
      <PublicCommentInterviewChat
        messages={messages}
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
    );
  }

  return (
    <>
      {view === "intro" && (
        <PublicCommentIntro
          onStart={handleStartClick}
          onViewComments={() => {
            window.location.href = routes.publicCommentMinpakuComments();
          }}
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
      {view === "review" && draft && (
        <DraftReview
          draft={draft}
          sources={sources}
          copied={copied}
          isBusy={busy}
          publicationRequested={publicationRequested}
          onDraftChange={(value) => setDraft({ ...draft, final_body: value })}
          onCopy={() => void copyDraft()}
          onPublicationChange={setPublicationRequested}
          onComplete={() => void complete()}
        />
      )}
      {view === "complete" && (
        <CompletePage publicationRequested={publicationRequested} />
      )}

      {error && (
        <div
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-[560px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg"
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
    </>
  );
}
