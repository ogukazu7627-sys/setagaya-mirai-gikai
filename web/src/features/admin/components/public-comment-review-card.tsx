import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PublicCommentReviewItem } from "../server/public-comment-admin";
import { updatePublicCommentReviewStatusAction } from "../server/public-comment-admin-actions";

export type PublicCommentReviewMode = "private" | "pending" | "published";

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
  mode,
}: {
  item: PublicCommentReviewItem;
  mode: PublicCommentReviewMode;
}) {
  if (mode === "private") return null;

  return (
    <div className="flex flex-wrap gap-2">
      {mode === "published" ? (
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

const MODE_LABELS: Record<PublicCommentReviewMode, string> = {
  private: "非公開（公開不可）",
  pending: "確認待ち",
  published: "公開中",
};

export function PublicCommentReviewCard({
  item,
  mode,
}: {
  item: PublicCommentReviewItem;
  mode: PublicCommentReviewMode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={mode === "published" ? "default" : "outline"}>
                {MODE_LABELS[mode]}
              </Badge>
              <Badge variant="secondary">{item.campaign.slug}</Badge>
            </div>
            <CardTitle className="text-lg">{item.campaign.title}</CardTitle>
            <CardDescription>
              完了: {formatDateTime(item.completed_at)}
            </CardDescription>
            <p className="break-all text-sm text-mirai-text-secondary">
              メールアドレス: {item.user_email ?? "取得できませんでした"}
            </p>
          </div>
          <ReviewActions item={item} mode={mode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-sm font-bold">
            {mode === "published"
              ? "公開本文"
              : mode === "pending"
                ? "公開予定本文"
                : "最終本文"}
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
            質問と回答の推移を確認
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
