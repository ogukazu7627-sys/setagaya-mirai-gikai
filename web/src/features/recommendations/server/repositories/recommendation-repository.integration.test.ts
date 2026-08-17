import {
  adminClient,
  cleanupTestBill,
  createTestBill,
  createTestBillContent,
  createTestBillTag,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  findRecommendationBillsByIds,
  findRecommendationCandidates,
} from "./recommendation-repository";

const billIds: string[] = [];

afterEach(async () => {
  for (const billId of billIds) {
    await cleanupTestBill(billId);
  }
  billIds.length = 0;
});

describe("recommendation repository", () => {
  it("only returns published bills with normal content and canonical tags", async () => {
    const published = await createTestBill({ publish_status: "published" });
    const draft = await createTestBill({ publish_status: "draft" });
    const hardOnly = await createTestBill({ publish_status: "published" });
    const budget = await createTestBill({
      publish_status: "published",
      publication_category: "budget",
    });
    billIds.push(published.id, draft.id, hardOnly.id, budget.id);
    await createTestBillContent(published.id, { difficulty_level: "normal" });
    await createTestBillContent(draft.id, { difficulty_level: "normal" });
    await createTestBillContent(hardOnly.id, { difficulty_level: "hard" });
    await createTestBillContent(budget.id, { difficulty_level: "normal" });
    const { data: tag } = await adminClient
      .from("tags")
      .select("id")
      .eq("label", "不登校支援")
      .single();
    if (!tag) throw new Error("canonical tag not found");
    await Promise.all([
      createTestBillTag(published.id, tag.id),
      createTestBillTag(draft.id, tag.id),
      createTestBillTag(hardOnly.id, tag.id),
      createTestBillTag(budget.id, tag.id),
    ]);

    const candidates = await findRecommendationCandidates();
    const candidateIds = new Set(candidates.map((candidate) => candidate.id));
    expect(candidateIds.has(published.id)).toBe(true);
    expect(candidateIds.has(draft.id)).toBe(false);
    expect(candidateIds.has(hardOnly.id)).toBe(false);
    expect(candidateIds.has(budget.id)).toBe(false);

    const hydrated = await findRecommendationBillsByIds(
      [published.id, draft.id, budget.id],
      "normal"
    );
    expect(hydrated.map((bill) => bill.id)).toEqual([published.id]);
    expect(hydrated[0]?.bill_content).not.toHaveProperty("content");
  });
});
