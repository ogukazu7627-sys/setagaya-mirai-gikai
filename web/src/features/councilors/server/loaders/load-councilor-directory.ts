import "server-only";

import { cache } from "react";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { getCouncilorStatementPreviewText } from "../../shared/utils/get-councilor-statement-preview-text";
import { selectDailyCouncilors } from "../../shared/utils/select-daily-councilors";
import {
  findActivePublicCouncilorById,
  findActivePublicCouncilors,
} from "../repositories/councilor-directory-repository";
import {
  findPublishedCouncilorStatementCounts,
  findPublishedCouncilorStatementCountsByCouncilorIds,
  findPublishedCouncilorStatementDetails,
} from "../repositories/councilor-statement-repository";

export async function loadCouncilorDirectory() {
  const [councilors, statementCounts] = await Promise.all([
    findActivePublicCouncilors(),
    isSetagayaMockMode
      ? Promise.resolve([])
      : findPublishedCouncilorStatementCounts(),
  ]);
  const statementCountByCouncilorId = new Map(
    statementCounts.flatMap((count) =>
      count.councilorId ? [[count.councilorId, count.statementCount]] : []
    )
  );

  return councilors.map((councilor) => ({
    ...councilor,
    statementCount: statementCountByCouncilorId.get(councilor.id) ?? 0,
  }));
}

export async function loadRecommendedCouncilors(currentDate: Date) {
  const councilors = await findActivePublicCouncilors();
  const recommendedCouncilors = selectDailyCouncilors(councilors, currentDate);
  const statementCounts = isSetagayaMockMode
    ? []
    : await findPublishedCouncilorStatementCountsByCouncilorIds(
        recommendedCouncilors.map((councilor) => councilor.id)
      );
  const statementCountByCouncilorId = new Map(
    statementCounts.map((count) => [count.councilorId, count.statementCount])
  );

  return recommendedCouncilors.map((councilor) => ({
    ...councilor,
    statementCount: statementCountByCouncilorId.get(councilor.id) ?? 0,
  }));
}

/**
 * 詳細ページ本体と generateMetadata の双方から呼ばれるため、
 * 同一リクエスト内では 1 回だけ問い合わせる。
 */
export const loadCouncilorDetail = cache(async (councilorId: string) => {
  const councilor = await findActivePublicCouncilorById(councilorId);
  if (!councilor) {
    return null;
  }

  const statementDetails = isSetagayaMockMode
    ? []
    : await findPublishedCouncilorStatementDetails({ councilorId });
  const statements = statementDetails.map(
    ({ billNormalContent, ...statement }) => ({
      ...statement,
      previewText: getCouncilorStatementPreviewText({
        normalContent: billNormalContent,
        statementIndex: statement.statement_index,
        fallbackText: statement.content_text,
      }),
    })
  );

  return {
    councilor,
    statements,
  };
});
