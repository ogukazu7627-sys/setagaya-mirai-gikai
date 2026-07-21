import Image from "next/image";
import { RubySafeLineClamp } from "@/components/ruby-safe-line-clamp";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateWithDots } from "@/lib/utils/date";
import type { BillWithContent } from "../../../shared/types";
import { getDisplayTags } from "../../../shared/utils/display-tags";
import { ReviewCompleteBadge } from "../bill-detail/review-status-banner";
import { BillItemTypeBadge } from "./bill-item-type-badge";
import { BillStatusBadge } from "./bill-status-badge";
import { BillTag } from "./bill-tag";

interface BillCardProps {
  bill: BillWithContent;
}

export function BillCard({ bill }: BillCardProps) {
  const displayTitle = bill.bill_content?.title;
  const summary = bill.bill_content?.summary;
  const showInterviewBadge =
    bill.interview_enabled === true && bill.hasPublicInterview === true;
  const committeeOrSpeaker = extractCommitteeOrSpeaker(bill);
  const displayTags = getDisplayTags(bill);

  return (
    <Card className="border border-black hover:bg-muted/50 transition-colors relative overflow-hidden max-w-[634px]">
      <div className="flex flex-col">
        {/* 注目バッジエリア */}
        {bill.is_featured && (
          <div
            className={`${bill.thumbnail_url != null ? "absolute" : "relative"} top-3 left-3 z-1`}
          >
            <span className="inline-flex items-center justify-center px-3 py-0.5 text-xs font-medium text-mirai-text bg-mirai-highlight rounded-[20px]">
              注目🔥
            </span>
          </div>
        )}

        {/* サムネイル画像 */}
        {bill.thumbnail_url && (
          <div className="relative w-full h-52 md:h-65">
            <Image
              src={bill.thumbnail_url}
              alt={bill.name}
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}

        {/* コンテンツエリア */}
        <div className="flex-1">
          <CardHeader>
            <div className="flex flex-col gap-3">
              <BillItemTypeBadge itemType={bill.item_type} className="w-fit" />
              <CardTitle className="text-2xl/8 tracking-normal">
                {displayTitle}
                {bill.is_review_completed && (
                  <>
                    {" "}
                    <ReviewCompleteBadge />
                  </>
                )}
              </CardTitle>
              <div className="flex flex-row gap-4">
                <BillStatusBadge
                  status={bill.status}
                  statusLabel={bill.status_label}
                  className="w-fit"
                />
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {bill.submitted_date && (
                    <time>{formatDateWithDots(bill.submitted_date)}</time>
                  )}
                </div>
              </div>
              {committeeOrSpeaker && (
                <p className="text-xs font-medium text-mirai-text-secondary">
                  {committeeOrSpeaker}
                </p>
              )}
              <RubySafeLineClamp
                text={summary}
                maxLength={132}
                lineClamp={4}
                className="text-sm leading-relaxed"
              />
              {/* タグ表示 */}
              {(displayTags.length > 0 || showInterviewBadge) && (
                <div className="flex flex-wrap gap-3">
                  {displayTags.map((tag) => (
                    <BillTag key={tag.id} tag={tag} />
                  ))}
                  {showInterviewBadge && (
                    <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-black bg-mirai-light-gradient rounded-full">
                      AIインタビュー受付中
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
        </div>
      </div>
    </Card>
  );
}

function extractCommitteeOrSpeaker(bill: BillWithContent): string | null {
  const note = bill.status_note;
  if (!note) return null;

  if (bill.item_type === "question") {
    const speaker = note.match(/本会議で(.+?)議員が質問/)?.[1];
    return speaker ? `質問者: ${speaker}議員` : null;
  }

  const committee =
    note.match(/（(.+?)）/)?.[1] ?? note.match(/(文教常任委員会)/)?.[1];
  return committee ? `委員会: ${committee}` : null;
}
