import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { requireAdmin } from "@/features/admin/server/auth";
import {
  listPendingPublicCommentReviews,
  listPublishedPublicCommentReviews,
  type PublicCommentReviewItem,
} from "@/features/admin/server/public-comment-admin";
import { updatePublicCommentReviewStatusAction } from "@/features/admin/server/public-comment-admin-actions";
import { routes } from "@/lib/routes";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function ReviewActions({
  item,
  published,
}: {
  item: PublicCommentReviewItem;
  published?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {published ? (
        <form action={updatePublicCommentReviewStatusAction}>
          <input type="hidden" name="sessionId" value={item.id} />
          <input type="hidden" name="status" value="unpublished" />
          <Button type="submit" size="sm" variant="outline">
            公開停止
          </Button>
        </form>
      ) : (
        <>
          <form action={updatePublicCommentReviewStatusAction}>
            <input type="hidden" name="sessionId" value={item.id} />
            <input type="hidden" name="status" value="published" />
            <Button type="submit" size="sm">
              公開
            </Button>
          </form>
          <form action={updatePublicCommentReviewStatusAction}>
            <input type="hidden" name="sessionId" value={item.id} />
            <input type="hidden" name="status" value="rejected" />
            <Button type="submit" size="sm" variant="destructive">
              却下
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

function ReviewCard({
  item,
  published,
}: {
  item: PublicCommentReviewItem;
  published?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={published ? "default" : "outline"}>
                {published ? "公開中" : "確認待ち"}
              </Badge>
              <Badge variant="secondary">{item.campaign.slug}</Badge>
            </div>
            <CardTitle className="text-lg">{item.campaign.title}</CardTitle>
            <CardDescription>
              完了: {formatDateTime(item.completed_at)}
            </CardDescription>
          </div>
          <ReviewActions item={item} published={published} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-sm font-bold">
            {published ? "公開本文" : "公開予定本文"}
          </h2>
          <div className="mt-2 whitespace-pre-wrap rounded-md border bg-gray-50 p-4 text-sm leading-7">
            {item.draft?.final_body ?? "本文なし"}
          </div>
          {item.draft?.target_ordinances.length ? (
            <p className="mt-3 text-xs text-gray-500">
              対象条例: {item.draft.target_ordinances.join(" / ")}
            </p>
          ) : null}
          {item.draft?.fact_check_notes.length ? (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">確認が必要な箇所</p>
              <ul className="mt-1 list-disc pl-5">
                {item.draft.fact_check_notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <details className="rounded-md border p-4">
          <summary className="cursor-pointer text-sm font-bold">
            会話履歴を確認
          </summary>
          <div className="mt-4 space-y-3">
            {item.messages.map((message) => (
              <div key={message.id} className="border-t pt-3 text-sm leading-6">
                <p className="font-semibold text-gray-500">
                  {message.role === "user" ? "ユーザー" : "AI"}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

export default async function AdminPublicCommentsPage() {
  const user = await requireAdmin(routes.adminPublicComments());
  const [pending, published] = await Promise.all([
    listPendingPublicCommentReviews(),
    listPublishedPublicCommentReviews(),
  ]);

  return (
    <AdminShell user={user}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">パブリックコメント確認</h1>
          <p className="mt-2 text-sm text-mirai-text-secondary">
            匿名公開を希望したコメントを、本文と会話履歴を確認してから公開します。
            世田谷区への公式提出は別途、本人が行います。
          </p>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">確認待ち</h2>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              公開前に、個人情報や事実関係が含まれていないか確認してください。
            </p>
          </div>
          {pending.length === 0 ? (
            <p className="rounded-xl border bg-white p-6 text-sm text-mirai-text-secondary">
              確認待ちのコメントはありません。
            </p>
          ) : (
            <div className="space-y-6">
              {pending.map((item) => (
                <ReviewCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">公開済みコメント</h2>
            <p className="mt-1 text-sm text-mirai-text-secondary">
              公開後に問題が見つかった場合は、公開停止できます。
            </p>
          </div>
          {published.length === 0 ? (
            <p className="rounded-xl border bg-white p-6 text-sm text-mirai-text-secondary">
              公開済みのコメントはありません。
            </p>
          ) : (
            <div className="space-y-6">
              {published.map((item) => (
                <ReviewCard key={item.id} item={item} published />
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
