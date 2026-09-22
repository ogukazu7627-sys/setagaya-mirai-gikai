import type { Route } from "next";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { PublicCommentReviewCard } from "@/features/admin/components/public-comment-review-card";
import { requireAdmin } from "@/features/admin/server/auth";
import { listPublicCommentAdminReviews } from "@/features/admin/server/public-comment-admin";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function AdminPublicCommentsPage() {
  const user = await requireAdmin(routes.adminPublicComments());
  const reviews = await listPublicCommentAdminReviews();

  return (
    <AdminShell user={user}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">パブリックコメント管理</h1>
          <p className="mt-2 text-sm text-mirai-text-secondary">
            完了した意見のメールアドレス、最終本文、質問と回答の推移を管理者だけが確認できます。
            非公開の意見は閲覧専用で、公開できません。
          </p>
          <Link
            href={routes.adminPublicCommentFunnel() as Route}
            className="mt-4 inline-flex text-sm font-bold text-mirai-primary hover:underline"
          >
            広告からイベント来場までのファネルを見る
          </Link>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              非公開で完了した意見（{reviews.private.length}件）
            </h2>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              管理者による確認専用です。公開操作はなく、公開ページにも表示されません。
            </p>
          </div>
          {reviews.private.length === 0 ? (
            <p className="rounded-xl border bg-white p-6 text-sm text-mirai-text-secondary">
              非公開で完了した意見はありません。
            </p>
          ) : (
            <div className="space-y-6">
              {reviews.private.map((item) => (
                <PublicCommentReviewCard
                  key={item.id}
                  item={item}
                  mode="private"
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              匿名公開の確認待ち（{reviews.pending.length}件）
            </h2>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              公開前に、個人情報や事実関係が含まれていないか確認してください。
            </p>
          </div>
          {reviews.pending.length === 0 ? (
            <p className="rounded-xl border bg-white p-6 text-sm text-mirai-text-secondary">
              確認待ちのコメントはありません。
            </p>
          ) : (
            <div className="space-y-6">
              {reviews.pending.map((item) => (
                <PublicCommentReviewCard
                  key={item.id}
                  item={item}
                  mode="pending"
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">
              公開済みコメント（{reviews.published.length}件）
            </h2>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              公開後に問題が見つかった場合は、公開停止できます。
            </p>
          </div>
          {reviews.published.length === 0 ? (
            <p className="rounded-xl border bg-white p-6 text-sm text-mirai-text-secondary">
              公開済みのコメントはありません。
            </p>
          ) : (
            <div className="space-y-6">
              {reviews.published.map((item) => (
                <PublicCommentReviewCard
                  key={item.id}
                  item={item}
                  mode="published"
                />
              ))}
            </div>
          )}
        </section>
        <Link
          href={routes.publicCommentMinpakuComments() as Route}
          className="text-sm font-bold text-mirai-primary hover:underline"
        >
          公開ページを確認する
        </Link>
      </div>
    </AdminShell>
  );
}
