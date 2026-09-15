"use client";

import {
  ArrowRight,
  Check,
  Clipboard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";
import {
  MINPAKU_CAMPAIGN_TITLE,
  MINPAKU_OFFICIAL_SUBMISSION_URL,
  MINPAKU_ORDINANCES,
  MINPAKU_SOURCES,
  MINPAKU_SUBMISSION_DEADLINE,
} from "../shared/campaign";

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

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-mirai-primary px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-mirai-primary px-5 py-3 text-sm font-bold text-mirai-primary transition hover:bg-mirai-primary/5 disabled:cursor-not-allowed disabled:opacity-50";

function formatDeadline() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(MINPAKU_SUBMISSION_DEADLINE));
}

export function PublicCommentMinpakuPage() {
  const userId = useAnonymousSupabaseUser();
  const [view, setView] = useState<View>("intro");
  const [consented, setConsented] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [answer, setAnswer] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [selectedOrdinances, setSelectedOrdinances] = useState<string[]>([
    ...MINPAKU_ORDINANCES,
  ]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sources, setSources] =
    useState<typeof MINPAKU_SOURCES>(MINPAKU_SOURCES);
  const [publicationRequested, setPublicationRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const startSession = useCallback(async () => {
    if (!consented || !userId) return;
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
        data.messages.map((message: Omit<Message, "id">) => ({
          ...message,
          id: crypto.randomUUID(),
        }))
      );
      setQuickReplies(data.quickReplies ?? []);
      setView("interview");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "開始できませんでした"
      );
    } finally {
      setBusy(false);
    }
  }, [consented, userId]);

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
          { ...data.message, id: crypto.randomUUID() },
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

  const copyDraft = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.final_body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 pb-24 sm:px-8 lg:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="mb-3 text-sm font-bold tracking-wide text-mirai-primary">
          世田谷区への意見を整理する
        </p>
        <h1 className="text-3xl font-bold leading-tight text-mirai-foreground sm:text-4xl">
          {MINPAKU_CAMPAIGN_TITLE}
        </h1>
        <p className="mt-5 text-base leading-8 text-mirai-muted">
          民泊や旅館業をめぐる経験・不安・期待を、区の公式資料を確認しながら、あなた自身のパブリックコメントの下書きに整理します。
        </p>
      </header>

      {error && (
        <div
          className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {view === "intro" && (
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-t-4 border-mirai-primary bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-mirai-primary">
              意見募集の期限
            </p>
            <p className="mt-2 text-2xl font-bold text-mirai-foreground">
              {formatDeadline()} 必着
            </p>
            <div className="mt-8 space-y-5 text-sm leading-7 text-mirai-muted">
              <p>
                対象は、世田谷区旅館業法施行条例の改正素案と、世田谷区住宅宿泊事業の適正な運営に関する条例の改正素案です。
              </p>
              <p>
                AIは賛成・反対を決めません。区の資料、あなたの経験、意見、提案を分けて整理し、最後にあなたが確認・編集する下書きを作ります。
              </p>
              <p>
                氏名・住所・施設名などは尋ねません。公式ページへの提出は行わず、あなた自身が転記して提出します。
              </p>
            </div>
            <label className="mt-8 flex cursor-pointer items-start gap-3 border-t border-mirai-border pt-5 text-sm leading-6 text-mirai-foreground">
              <input
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.target.checked)}
                className="mt-1 h-4 w-4 accent-mirai-primary"
              />
              <span>
                回答をこのインタビューの改善と下書き作成のために保存することに同意します。公開は別途、最後に選択します。
              </span>
            </label>
            <button
              type="button"
              onClick={startSession}
              disabled={!consented || !userId || busy}
              className={`${buttonClass} mt-6`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {userId ? "インタビューを始める" : "匿名セッションを準備中"}
            </button>
          </div>
          <aside className="border-l-2 border-mirai-border pl-6 sm:pl-8">
            <h2 className="text-lg font-bold text-mirai-foreground">
              確認できる公式資料
            </h2>
            <ul className="mt-4 space-y-4">
              {MINPAKU_SOURCES.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-2 text-sm font-bold leading-6 text-mirai-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="mt-1 h-4 w-4 shrink-0" />
                    {source.title}
                  </a>
                  <p className="mt-1 text-sm leading-6 text-mirai-muted">
                    {source.description}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      )}

      {view === "interview" && (
        <section className="max-w-3xl">
          <div className="mb-5 border-b border-mirai-border pb-4">
            <p className="text-sm font-bold text-mirai-primary">聞き取り</p>
            <p className="mt-1 text-sm text-mirai-muted">
              回答は短くても大丈夫です。必要に応じて、もう少しだけ詳しく伺います。
            </p>
          </div>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-md bg-mirai-primary px-4 py-3 text-sm leading-7 text-white sm:ml-24"
                    : "mr-8 rounded-md border border-mirai-border bg-white px-4 py-3 text-sm leading-7 text-mirai-foreground sm:mr-24"
                }
              >
                <p className="mb-1 text-xs font-bold opacity-70">
                  {message.role === "user" ? "あなた" : "AIインタビュー"}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>
          {quickReplies.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => sendAnswer(reply)}
                  disabled={busy}
                  className={secondaryButtonClass}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              void sendAnswer();
            }}
          >
            <label htmlFor="public-comment-answer" className="sr-only">
              回答
            </label>
            <textarea
              id="public-comment-answer"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="あなたの経験や考えを書いてください"
              className="w-full resize-y rounded-md border border-mirai-border bg-white p-4 text-sm leading-7 text-mirai-foreground outline-none focus:border-mirai-primary focus:ring-2 focus:ring-mirai-primary/20"
            />
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-xs text-mirai-muted">
                個人を特定する情報は書かないでください
              </span>
              <button
                type="submit"
                disabled={!answer.trim() || busy}
                className={buttonClass}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                送信
              </button>
            </div>
          </form>
        </section>
      )}

      {view === "ordinances" && (
        <section className="max-w-3xl">
          <p className="text-sm font-bold text-mirai-primary">下書きの対象</p>
          <h2 className="mt-2 text-2xl font-bold text-mirai-foreground">
            どの条例について意見を書きますか？
          </h2>
          <p className="mt-3 text-sm leading-7 text-mirai-muted">
            片方だけでも、両方をまとめても作成できます。
          </p>
          <div className="mt-7 space-y-3">
            {MINPAKU_ORDINANCES.map((ordinance) => {
              const checked = selectedOrdinances.includes(ordinance);
              return (
                <label
                  key={ordinance}
                  className="flex cursor-pointer items-start gap-3 border border-mirai-border bg-white p-4 text-sm leading-7 text-mirai-foreground hover:border-mirai-primary"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedOrdinances((current) =>
                        checked
                          ? current.filter((item) => item !== ordinance)
                          : [...current, ordinance]
                      )
                    }
                    className="mt-1 h-4 w-4 accent-mirai-primary"
                  />
                  {ordinance}
                </label>
              );
            })}
          </div>
          <button
            type="button"
            onClick={generateDraft}
            disabled={selectedOrdinances.length === 0 || busy}
            className={`${buttonClass} mt-7`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            下書きを作る
          </button>
        </section>
      )}

      {view === "review" && draft && (
        <section className="max-w-4xl">
          <p className="text-sm font-bold text-mirai-primary">確認・編集</p>
          <h2 className="mt-2 text-2xl font-bold text-mirai-foreground">
            あなたの言葉になっているか確認してください
          </h2>
          <p className="mt-3 text-sm leading-7 text-mirai-muted">
            AIが作った本文と、あなたが編集して保存する本文を分けて管理しています。提出前に必ず事実関係も確認してください。
          </p>
          <label
            htmlFor="public-comment-draft"
            className="mt-7 block text-sm font-bold text-mirai-foreground"
          >
            提出用に編集する本文
          </label>
          <textarea
            id="public-comment-draft"
            value={draft.final_body}
            onChange={(event) =>
              setDraft({ ...draft, final_body: event.target.value })
            }
            rows={18}
            className="mt-2 w-full resize-y rounded-md border border-mirai-border bg-white p-4 text-sm leading-7 text-mirai-foreground outline-none focus:border-mirai-primary focus:ring-2 focus:ring-mirai-primary/20"
          />
          {draft.fact_check_notes.length > 0 && (
            <div className="mt-5 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
              <p className="font-bold">確認が必要な箇所</p>
              <ul className="mt-1 list-disc pl-5">
                {draft.fact_check_notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-7 border-t border-mirai-border pt-6">
            <h3 className="text-base font-bold text-mirai-foreground">
              確認した資料
            </h3>
            <ul className="mt-3 space-y-2">
              {sources.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-mirai-primary underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyDraft()}
              className={secondaryButtonClass}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Clipboard className="h-4 w-4" />
              )}
              {copied ? "コピーしました" : "本文をコピー"}
            </button>
            <a
              href={MINPAKU_OFFICIAL_SUBMISSION_URL}
              target="_blank"
              rel="noreferrer"
              className={secondaryButtonClass}
            >
              <ExternalLink className="h-4 w-4" />
              公式提出ページ
            </a>
          </div>
          <label className="mt-8 flex cursor-pointer items-start gap-3 border-t border-mirai-border pt-5 text-sm leading-7 text-mirai-foreground">
            <input
              type="checkbox"
              checked={publicationRequested}
              onChange={(event) =>
                setPublicationRequested(event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-mirai-primary"
            />
            <span>
              この最終コメントを匿名で公開し、運営の確認を受けることに同意します。公開前に人が確認し、会話全文や個人情報は公開しません。
            </span>
          </label>
          <button
            type="button"
            onClick={complete}
            disabled={busy || !draft.final_body.trim()}
            className={`${buttonClass} mt-6`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            確認して完了
          </button>
        </section>
      )}

      {view === "complete" && (
        <section className="max-w-3xl border-t-4 border-mirai-primary bg-white p-6 shadow-sm sm:p-8">
          <Check className="h-8 w-8 text-mirai-primary" />
          <h2 className="mt-4 text-2xl font-bold text-mirai-foreground">
            下書きを保存しました
          </h2>
          <p className="mt-4 text-sm leading-7 text-mirai-muted">
            公式提出ページを開き、本文を転記してください。氏名・住所などは、公式フォームの案内を確認して本人が入力します。
          </p>
          {publicationRequested && (
            <p className="mt-4 border-l-2 border-mirai-primary px-4 py-2 text-sm leading-7 text-mirai-foreground">
              匿名公開の申請は運営確認待ちです。承認されたコメントだけが公開一覧に表示されます。
            </p>
          )}
          <a
            href={MINPAKU_OFFICIAL_SUBMISSION_URL}
            target="_blank"
            rel="noreferrer"
            className={`${buttonClass} mt-7`}
          >
            <ExternalLink className="h-4 w-4" />
            公式提出ページを開く
          </a>
        </section>
      )}
    </div>
  );
}
