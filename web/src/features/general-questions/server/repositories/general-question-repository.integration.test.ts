import {
  adminClient,
  cleanupTestBill,
  cleanupTestDietSession,
  createTestBill,
  createTestBillContent,
  createTestDietSession,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  findPublishedGeneralQuestionCategoryCards,
  findPublishedGeneralQuestionReferenceByBillId,
  findPublishedGeneralQuestions,
} from "./general-question-repository";

describe("general-question-repository 統合テスト", () => {
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

  it("公開中の一般質問だけを会期内の大分類カードへ集約する", async () => {
    const session = await createTestDietSession({
      start_date: "2026-01-01",
      end_date: "2026-12-31",
    });
    dietSessionIds.push(session.id);
    const educationQuestions = await Promise.all([
      createGeneralQuestion(session.id, "教育🏫", "2026-02-18"),
      createGeneralQuestion(session.id, "教育🏫", "2026-02-20"),
    ]);
    const disasterQuestion = await createGeneralQuestion(
      session.id,
      "防災☔",
      "2026-02-19"
    );
    const draft = await createTestBill({
      diet_session_id: session.id,
      publication_category: "general_question",
      publish_status: "draft",
      major_category: "教育🏫",
    });
    const report = await createTestBill({
      diet_session_id: session.id,
      publication_category: "report",
      publish_status: "published",
      major_category: "教育🏫",
    });
    billIds.push(
      ...educationQuestions.map(({ id }) => id),
      disasterQuestion.id,
      draft.id,
      report.id
    );

    const cards = await findPublishedGeneralQuestionCategoryCards(
      [session.id],
      2026
    );

    expect(cards).toEqual([
      expect.objectContaining({
        categoryId: "education",
        questionCount: 2,
        latestSubmittedDate: "2026-02-20",
      }),
      expect.objectContaining({
        categoryId: "disaster-prevention",
        questionCount: 1,
        latestSubmittedDate: "2026-02-19",
      }),
    ]);
  });

  it("一般質問の本文と正規化済み議員発言をカテゴリページ用に結合する", async () => {
    const session = await createTestDietSession({
      name: "令和8年第1回定例会",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
    });
    dietSessionIds.push(session.id);
    const bill = await createGeneralQuestion(
      session.id,
      "教育🏫",
      "2026-02-20"
    );
    billIds.push(bill.id);
    await createTestBillContent(bill.id, {
      difficulty_level: "normal",
      title: "教育環境について",
      summary: "教育環境の概要",
      content: "# 議員、会派の意見\n\n質問と答弁",
    });
    await createTestBillContent(bill.id, {
      difficulty_level: "hard",
      title: "教育環境について（詳しく）",
      summary: "教育環境の詳しい概要",
      content: "# 詳しい本文",
    });
    const { error } = await adminClient
      .from("councilor_bill_statements")
      .insert({
        bill_id: bill.id,
        difficulty_level: "normal",
        statement_index: 0,
        councilor_name: "テスト議員",
        raw_heading: "テスト議員（テスト会派）",
        party_or_group: "テスト会派",
        content_md: "質問本文",
        content_text: "質問本文",
      });
    if (error) {
      throw new Error(`議員発言の作成失敗: ${error.message}`);
    }

    const questions = await findPublishedGeneralQuestions({
      dietSessionIds: [session.id],
      majorCategory: "教育🏫",
    });

    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      id: bill.id,
      categoryId: "education",
      submittedDate: "2026-02-20",
      partyOrGroup: "テスト会派",
      councilor: {
        id: "name:テスト議員",
        displayName: "テスト議員",
        iconUrl: null,
      },
      dietSession: { id: session.id, name: "令和8年第1回定例会" },
      contents: {
        normal: { title: "教育環境について" },
        hard: { title: "教育環境について（詳しく）" },
      },
    });
    expect(
      await findPublishedGeneralQuestionReferenceByBillId(bill.id)
    ).toEqual({ categoryId: "education", year: 2026 });
  });

  async function createGeneralQuestion(
    dietSessionId: string,
    majorCategory: string,
    submittedDate: string
  ) {
    return createTestBill({
      name: `一般質問 ${majorCategory} ${submittedDate}`,
      diet_session_id: dietSessionId,
      publication_category: "general_question",
      publish_status: "published",
      major_category: majorCategory,
      submitted_date: submittedDate,
    });
  }
});
