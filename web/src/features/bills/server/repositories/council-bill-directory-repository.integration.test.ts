import {
  cleanupTestBill,
  cleanupTestDietSession,
  createTestBill,
  createTestBillContent,
  createTestDietSession,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  findPublishedCouncilBillCardRowsByIds,
  findPublishedCouncilBillDirectoryEntries,
} from "./council-bill-directory-repository";

describe("council-bill-directory-repository 統合テスト", () => {
  const billIds: string[] = [];
  const dietSessionIds: string[] = [];

  afterEach(async () => {
    for (const billId of billIds) {
      await cleanupTestBill(billId);
    }
    billIds.length = 0;
    for (const sessionId of dietSessionIds) {
      await cleanupTestDietSession(sessionId);
    }
    dietSessionIds.length = 0;
  });

  it("公開カードに必要な項目だけを難易度・会期で絞って取得する", async () => {
    const session = await createTestDietSession();
    dietSessionIds.push(session.id);
    const publishedBill = await createTestBill({
      diet_session_id: session.id,
      publish_status: "published",
      submitted_date: "2026-07-27",
    });
    const draftBill = await createTestBill({
      diet_session_id: session.id,
      publish_status: "draft",
    });
    billIds.push(publishedBill.id, draftBill.id);
    await createTestBillContent(publishedBill.id, {
      difficulty_level: "normal",
      title: "軽量カードのタイトル",
      summary: "軽量カードの概要",
      content: "初期一覧では取得してはいけない本文",
    });
    await createTestBillContent(draftBill.id, {
      difficulty_level: "normal",
    });

    const entries = await findPublishedCouncilBillDirectoryEntries(
      [session.id],
      "normal"
    );
    expect(entries).toEqual([
      expect.objectContaining({
        id: publishedBill.id,
        submittedDate: "2026-07-27",
      }),
    ]);

    const rows = await findPublishedCouncilBillCardRowsByIds(
      [publishedBill.id, draftBill.id],
      [session.id],
      "normal"
    );
    expect(rows).toHaveLength(1);
    const content = Array.isArray(rows[0]?.bill_contents)
      ? rows[0]?.bill_contents[0]
      : rows[0]?.bill_contents;
    expect(content).toEqual(
      expect.objectContaining({
        title: "軽量カードのタイトル",
        summary: "軽量カードの概要",
      })
    );
    expect(content).not.toHaveProperty("content");
  });
});
