import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/features/auth/server/lib/auth-server";
import { updateMinpakuCommentStatus } from "@/features/public-comments/server/actions/public-comment-actions";
import {
  findMinpakuPendingComments,
  findMinpakuPublishedComments,
} from "@/features/public-comments/server/repository";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function PublicCommentsPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(routes.login());

  const [sessions, publishedComments] = await Promise.all([
    findMinpakuPendingComments(),
    findMinpakuPublishedComments(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          パブリックコメント確認
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          公開同意された民泊・旅館業条例改正素案へのコメントを、人が確認してから公開します。
        </p>
      </div>
      {sessions.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-sm text-gray-600">
          確認待ちのコメントはありません。
        </p>
      ) : (
        <div className="space-y-6">
          {sessions.map((session) => {
            const draft = Array.isArray(session.public_comment_drafts)
              ? session.public_comment_drafts[0]
              : session.public_comment_drafts;
            const messages = Array.isArray(session.public_comment_messages)
              ? session.public_comment_messages
              : [];
            return (
              <article
                key={session.id}
                className="rounded-lg border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      確認待ち
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      完了:{" "}
                      {session.completed_at
                        ? new Date(session.completed_at).toLocaleString("ja-JP")
                        : "-"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={updateMinpakuCommentStatus}>
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id}
                      />
                      <input type="hidden" name="status" value="published" />
                      <button
                        type="submit"
                        className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        公開
                      </button>
                    </form>
                    <form action={updateMinpakuCommentStatus}>
                      <input
                        type="hidden"
                        name="sessionId"
                        value={session.id}
                      />
                      <input type="hidden" name="status" value="rejected" />
                      <button
                        type="submit"
                        className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        却下
                      </button>
                    </form>
                  </div>
                </div>
                <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      公開予定本文
                    </h2>
                    <div className="mt-2 whitespace-pre-wrap rounded-md border bg-gray-50 p-4 text-sm leading-7 text-gray-800">
                      {draft?.final_body ?? "本文なし"}
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      対象条例:{" "}
                      {draft?.target_ordinances?.join(" / ") ?? "未設定"}
                    </p>
                    {draft?.fact_check_notes?.length > 0 && (
                      <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                        <p className="font-semibold">確認が必要な箇所</p>
                        <ul className="mt-1 list-disc pl-5">
                          {draft.fact_check_notes.map((note: string) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <details className="rounded-md border p-4">
                    <summary className="cursor-pointer text-sm font-bold text-gray-900">
                      会話履歴を確認
                    </summary>
                    <div className="mt-4 space-y-3">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className="border-t pt-3 text-sm leading-6"
                        >
                          <p className="font-semibold text-gray-500">
                            {message.role === "user" ? "ユーザー" : "AI"}
                          </p>
                          <p className="whitespace-pre-wrap text-gray-800">
                            {message.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">公開済みコメント</h2>
          <p className="mt-1 text-sm text-gray-600">
            掲載後に問題が見つかった場合は、ここから公開停止できます。
          </p>
        </div>
        {publishedComments.length === 0 ? (
          <p className="rounded-lg border bg-white p-6 text-sm text-gray-600">
            公開済みのコメントはありません。
          </p>
        ) : (
          <div className="space-y-4">
            {publishedComments.map((item) => {
              const draft = Array.isArray(item.public_comment_drafts)
                ? item.public_comment_drafts[0]
                : item.public_comment_drafts;
              return (
                <article
                  key={item.id}
                  className="rounded-lg border bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        公開中
                      </p>
                      <p className="mt-2 text-sm leading-7 text-gray-800">
                        {draft?.final_body ?? "本文なし"}
                      </p>
                      <p className="mt-3 text-xs text-gray-500">
                        対象条例:{" "}
                        {draft?.target_ordinances?.join(" / ") ?? "未設定"}
                      </p>
                    </div>
                    <form action={updateMinpakuCommentStatus}>
                      <input type="hidden" name="sessionId" value={item.id} />
                      <input type="hidden" name="status" value="unpublished" />
                      <button
                        type="submit"
                        className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        公開停止
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
