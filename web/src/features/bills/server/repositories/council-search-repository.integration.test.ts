import {
  adminClient,
  cleanupTestBill,
  cleanupTestDietSession,
  cleanupTestTag,
  createTestBill,
  createTestBillContent,
  createTestBillTag,
  createTestDietSession,
  createTestTag,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { findCouncilBillIdsByKeyword } from "./council-search-repository";

describe("council-search-repository 統合テスト", () => {
  const billIds: string[] = [];
  const dietSessionIds: string[] = [];
  const tagIds: string[] = [];

  afterEach(async () => {
    for (const billId of billIds) {
      await cleanupTestBill(billId);
    }
    billIds.length = 0;
    for (const tagId of tagIds) {
      await cleanupTestTag(tagId);
    }
    tagIds.length = 0;
    for (const sessionId of dietSessionIds) {
      await cleanupTestDietSession(sessionId);
    }
    dietSessionIds.length = 0;
  });

  it("公開情報を部分一致し、公開中の指定会期・条件だけを返す", async () => {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const keyword = `標準検索${stamp}`;
    const currentSession = await createTestDietSession({
      name: `検索対象会期 ${stamp}`,
      slug: `search-current-${stamp}`,
      start_date: "2026-01-01",
      end_date: "2026-12-31",
    });
    const oldSession = await createTestDietSession({
      name: `検索対象外会期 ${stamp}`,
      slug: `search-old-${stamp}`,
      start_date: "2025-01-01",
      end_date: "2025-12-31",
    });
    dietSessionIds.push(currentSession.id, oldSession.id);

    const nameBill = await createSearchableBill(currentSession.id, {
      name: `${keyword}を含む案件名`,
      submittedDate: "2026-05-05",
    });
    const titleBill = await createSearchableBill(currentSession.id, {
      title: `${keyword}を含む本文タイトル`,
      submittedDate: "2026-05-04",
    });
    const summaryBill = await createSearchableBill(currentSession.id, {
      summary: `${keyword}を含む概要`,
      submittedDate: "2026-05-03",
    });
    const contentBill = await createSearchableBill(currentSession.id, {
      content: `# 本文\n${keyword}を含む本文です。`,
      submittedDate: "2026-05-02",
    });
    const tagBill = await createSearchableBill(currentSession.id, {
      submittedDate: "2026-05-01",
    });
    const matchingTag = await createTestTag({ label: `${keyword}タグ` });
    tagIds.push(matchingTag.id);
    await createTestBillTag(tagBill.id, matchingTag.id);

    const draftBill = await createSearchableBill(currentSession.id, {
      name: `${keyword}の下書き`,
      publishStatus: "draft",
    });
    const oldBill = await createSearchableBill(oldSession.id, {
      name: `${keyword}の過年度案件`,
    });

    const result = await findCouncilBillIdsByKeyword({
      keyword,
      dietSessionIds: [currentSession.id],
      contentType: "report",
      majorCategory: "教育🏫",
      committeeName: "文教常任委員会",
    });

    expect(result).toEqual([
      nameBill.id,
      titleBill.id,
      summaryBill.id,
      contentBill.id,
      tagBill.id,
    ]);
    expect(result).not.toContain(draftBill.id);
    expect(result).not.toContain(oldBill.id);

    await expect(
      findCouncilBillIdsByKeyword({
        keyword,
        dietSessionIds: [currentSession.id],
        contentType: "report",
        majorCategory: "教育🏫",
        committeeName: "福祉保健常任委員会",
      })
    ).resolves.toEqual([]);
  });

  async function createSearchableBill(
    dietSessionId: string,
    options: {
      name?: string;
      title?: string;
      summary?: string;
      content?: string;
      submittedDate?: string;
      publishStatus?: "draft" | "published";
    } = {}
  ) {
    const bill = await createTestBill({
      diet_session_id: dietSessionId,
      name: options.name ?? `通常案件 ${billIds.length + 1}`,
      publish_status: options.publishStatus ?? "published",
      publication_category: "report",
      major_category: "教育🏫",
      submitted_date: options.submittedDate ?? "2026-04-01",
    });
    billIds.push(bill.id);
    const { error } = await adminClient
      .from("bills")
      .update({
        item_type: "report",
        status_note: "文教常任委員会で報告",
      })
      .eq("id", bill.id);
    if (error) {
      throw new Error(`検索テスト案件の更新失敗: ${error.message}`);
    }
    await createTestBillContent(bill.id, {
      difficulty_level: "normal",
      title: options.title ?? "通常の本文タイトル",
      summary: options.summary ?? "通常の概要",
      content: options.content ?? "# 通常の本文",
    });
    return bill;
  }
});
