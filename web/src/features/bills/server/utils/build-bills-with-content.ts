import type { Bill, BillContent, BillWithContent } from "../../shared/types";
import {
  findBillIdsWithPublicInterview,
  findTagsByBillIds,
} from "../repositories/bill-repository";

export type BillRowWithContent = Bill & {
  bill_contents: BillContent[] | BillContent | null;
  tags?: unknown;
};

export async function buildBillsWithContent(
  rows: BillRowWithContent[]
): Promise<BillWithContent[]> {
  if (rows.length === 0) {
    return [];
  }

  const billIds = rows.map((item) => item.id);
  const [tagsByBillId, interviewBillIds] = await Promise.all([
    findTagsByBillIds(billIds),
    findBillIdsWithPublicInterview(billIds),
  ]);

  return rows.map((item) => {
    const { bill_contents, tags: _joinedTags, ...bill } = item;
    return {
      ...bill,
      knowledge_source: null,
      bill_content: toListBillContent(bill_contents),
      tags: tagsByBillId.get(item.id) ?? [],
      hasPublicInterview: interviewBillIds.has(item.id),
    };
  }) as BillWithContent[];
}

function toListBillContent(
  billContents: BillContent[] | BillContent | null
): BillContent | undefined {
  const billContent = Array.isArray(billContents)
    ? billContents[0]
    : (billContents ?? undefined);

  if (!billContent) {
    return undefined;
  }

  return {
    ...billContent,
    content: "",
  };
}
