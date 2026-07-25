import "server-only";

import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import {
  findActivePublicCouncilorById,
  findActivePublicCouncilors,
} from "../repositories/councilor-directory-repository";
import {
  findPublishedCouncilorStatementCounts,
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

export async function loadCouncilorDetail(councilorId: string) {
  const councilor = await findActivePublicCouncilorById(councilorId);
  if (!councilor) {
    return null;
  }

  const statements = isSetagayaMockMode
    ? []
    : await findPublishedCouncilorStatementDetails({ councilorId });

  return {
    councilor,
    statements,
  };
}
