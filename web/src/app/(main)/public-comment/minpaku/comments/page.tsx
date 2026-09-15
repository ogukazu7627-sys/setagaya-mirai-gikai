import { ExternalLink } from "lucide-react";
import {
  findCampaign,
  findPublishedDrafts,
} from "@/features/public-comment/minpaku/server/repository";
import {
  MINPAKU_CAMPAIGN_SLUG,
  MINPAKU_OFFICIAL_SUBMISSION_URL,
} from "@/features/public-comment/minpaku/shared/campaign";

export const dynamic = "force-dynamic";

export default async function MinpakuPublicCommentsPage() {
  const campaign = await findCampaign(MINPAKU_CAMPAIGN_SLUG);
  const drafts = campaign ? await findPublishedDrafts(campaign.id) : [];

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 pb-24 sm:px-8 lg:py-16">
      <p className="text-sm font-bold text-mirai-primary">
        匿名で公開された意見
      </p>
      <h1 className="mt-2 text-3xl font-bold text-mirai-foreground">
        民泊・旅館業の条例改正素案へのコメント
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-mirai-muted">
        本人の公開同意と運営確認を経た、最終コメント本文だけを掲載しています。インタビューの会話や個人情報は公開しません。
      </p>
      <div className="mt-8 space-y-5">
        {drafts.length === 0 ? (
          <p className="border-t border-mirai-border py-6 text-sm text-mirai-muted">
            公開されたコメントはまだありません。
          </p>
        ) : (
          drafts.map((draft) => (
            <article
              key={draft.id}
              className="border-t border-mirai-border py-6"
            >
              <div className="flex flex-wrap gap-2">
                {draft.target_ordinances.map((ordinance) => (
                  <span
                    key={ordinance}
                    className="text-xs font-bold text-mirai-primary"
                  >
                    {ordinance}
                  </span>
                ))}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-mirai-foreground">
                {draft.final_body}
              </p>
            </article>
          ))
        )}
      </div>
      <a
        href={MINPAKU_OFFICIAL_SUBMISSION_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-mirai-primary underline-offset-4 hover:underline"
      >
        <ExternalLink className="h-4 w-4" />
        世田谷区の意見募集ページ
      </a>
    </div>
  );
}
