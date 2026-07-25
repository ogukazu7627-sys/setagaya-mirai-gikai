import { describe, expect, it } from "vitest";
import type { BillPublishStatus, BillWithContent } from "../types";
import { pickRandomPublishedBills } from "./pick-random-bills";

describe("pickRandomPublishedBills", () => {
  it("公開済みの別案件から重複なしで指定件数を選ぶ", () => {
    const bills = [
      createBill("current"),
      createBill("draft", "draft"),
      createBill("bill-1"),
      createBill("bill-2"),
      createBill("bill-3"),
      createBill("bill-4"),
      createBill("bill-5"),
      createBill("bill-1"),
    ];

    const result = pickRandomPublishedBills(bills, "current", 4, () => 0);

    expect(result).toHaveLength(4);
    expect(result.map((bill) => bill.id)).not.toContain("current");
    expect(result.map((bill) => bill.id)).not.toContain("draft");
    expect(new Set(result.map((bill) => bill.id))).toHaveLength(4);
  });

  it("候補が指定件数より少ない場合は存在する案件だけを返す", () => {
    const result = pickRandomPublishedBills(
      [createBill("current"), createBill("bill-1"), createBill("bill-2")],
      "current",
      4,
      () => 0
    );

    expect(result.map((bill) => bill.id).sort()).toEqual(["bill-1", "bill-2"]);
  });

  it("乱数に応じて選出順を変更し、元配列は変更しない", () => {
    const bills = [
      createBill("bill-1"),
      createBill("bill-2"),
      createBill("bill-3"),
      createBill("bill-4"),
      createBill("bill-5"),
    ];
    const originalOrder = bills.map((bill) => bill.id);

    const lowerRandomResult = pickRandomPublishedBills(
      bills,
      "current",
      4,
      () => 0
    );
    const higherRandomResult = pickRandomPublishedBills(
      bills,
      "current",
      4,
      () => 0.999999
    );

    expect(lowerRandomResult.map((bill) => bill.id)).not.toEqual(
      higherRandomResult.map((bill) => bill.id)
    );
    expect(bills.map((bill) => bill.id)).toEqual(originalOrder);
  });
});

function createBill(
  id: string,
  publishStatus: BillPublishStatus = "published"
): BillWithContent {
  return {
    id,
    name: `案件 ${id}`,
    publish_status: publishStatus,
    tags: [],
  } as unknown as BillWithContent;
}
