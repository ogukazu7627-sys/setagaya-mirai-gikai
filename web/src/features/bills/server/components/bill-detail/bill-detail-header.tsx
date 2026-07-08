import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInterviewLPLink } from "@/features/interview-config/shared/utils/interview-links";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import { BillDetailShareButton } from "../../../client/components/bill-detail/bill-detail-share-button";
import {
  ReviewCompleteBadge,
  ReviewInProgressBanner,
} from "../../../client/components/bill-detail/review-status-banner";
import { BillItemTypeBadge } from "../../../client/components/bill-list/bill-item-type-badge";
import { BillStatusBadge } from "../../../client/components/bill-list/bill-status-badge";
import { BillTag } from "../../../client/components/bill-list/bill-tag";
import { getBillShareData } from "../../../client/utils/share";
import type { BillWithContent } from "../../../shared/types";
import { getDisplayTags } from "../../../shared/utils/display-tags";

interface BillDetailHeaderProps {
  bill: BillWithContent;
  hasInterviewConfig?: boolean;
  /** 意見数（トピック分析の total_opinions）。回答者数（人数）ではない点に注意。 */
  opinionCount?: number;
  /** 公開トピック数。1件以上ならトピック一覧への導線として件数を併記する。 */
  topicCount?: number;
}

function DietSessionMeta({
  session,
}: {
  session: BillWithContent["diet_session"];
}) {
  if (!session?.name) return null;

  const label = `＠${session.name}`;
  if (!session.slug) {
    return <span>{label}</span>;
  }

  return (
    <Link
      href={routes.kokkaiSessionBills(session.slug) as Route}
      className="underline-offset-4 hover:text-primary hover:underline"
    >
      {label}
    </Link>
  );
}

export async function BillDetailHeader({
  bill,
  hasInterviewConfig,
  opinionCount,
  topicCount,
}: BillDetailHeaderProps) {
  const displayTitle = bill.bill_content?.title;
  const displaySummary = bill.bill_content?.summary;
  const displayTags = getDisplayTags(bill);
  const hasDateMeta = Boolean(bill.submitted_date || bill.diet_session?.name);

  const { shareUrl, shareMessage, thumbnailUrl } = await getBillShareData(bill);

  return (
    <div className="mb-8 bg-white rounded-b-4xl">
      {bill.thumbnail_url ? (
        <div className="relative w-full h-72 md:h-80">
          <Image
            src={bill.thumbnail_url}
            alt={bill.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      ) : (
        <div className="w-full h-20 bg-white-100" />
      )}

      <div className="px-4 pt-8 mb-3">
        {displayTitle && (
          <h1 className="text-2xl font-bold mb-3">
            {displayTitle}
            {bill.is_review_completed && (
              <>
                {" "}
                <ReviewCompleteBadge showTooltip />
              </>
            )}
          </h1>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <BillItemTypeBadge itemType={bill.item_type} />
          <BillStatusBadge
            status={bill.status}
            statusLabel={bill.status_label}
            className="w-fit"
          />
          {hasDateMeta && (
            <div className="flex flex-wrap items-center gap-0 text-xs font-medium text-muted-foreground">
              {bill.submitted_date && (
                <time>{formatDateWithDots(bill.submitted_date)} 提出</time>
              )}
              <DietSessionMeta session={bill.diet_session} />
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-8">
        {displaySummary && (
          <p className="mb-4 leading-relaxed">{displaySummary}</p>
        )}

        {/* タグ表示 */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {displayTags.map((tag) => (
              <BillTag key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground font-medium mb-4">
          {bill.name}
        </p>
        {!bill.is_review_completed && (
          <div className="mb-4">
            <ReviewInProgressBanner />
          </div>
        )}

        {opinionCount != null && opinionCount > 0 && (
          <Link
            href={
              (topicCount != null && topicCount > 0
                ? routes.billTopics(bill.id)
                : routes.billOpinions(bill.id)) as Route
            }
            className="flex items-center gap-1 mb-4 text-primary-accent hover:opacity-80"
          >
            <MessageSquare className="size-4 relative top-[1px]" />
            <span className="text-[14px] font-bold leading-[14px] tracking-[0.14px]">
              {topicCount != null &&
                topicCount > 0 &&
                `${topicCount}件のトピック・`}
              {opinionCount}件のご意見
            </span>
          </Link>
        )}
        <div className="flex items-center gap-2">
          {hasInterviewConfig && (
            <Button
              variant="default"
              size="sm"
              asChild
              className="bg-mirai-light-gradient text-[13px] font-bold text-gray-800 gap-1.5 py-1 px-3"
            >
              <Link href={getInterviewLPLink(bill.id) as Route}>
                <Image
                  src="/icons/interview-cooperation.svg"
                  alt=""
                  width={23}
                  height={23}
                />
                AIインタビューに協力する
              </Link>
            </Button>
          )}
          <BillDetailShareButton
            shareMessage={shareMessage}
            shareUrl={shareUrl}
            thumbnailUrl={thumbnailUrl}
          />
        </div>
      </div>
    </div>
  );
}
