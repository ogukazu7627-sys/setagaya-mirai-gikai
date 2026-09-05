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

  it("公開中の一般質問を会期と大分類ごとのカードへ集約する", async () => {
    const firstSession = await createTestDietSession({
      name: "令和8年第1回定例会",
      slug: `general-question-first-${Date.now()}`,
      start_date: "2026-02-01",
      end_date: "2026-03-31",
    });
    const secondSession = await createTestDietSession({
      name: "令和8年第2回定例会",
      slug: `general-question-second-${Date.now()}`,
      start_date: "2026-06-01",
      end_date: "2026-07-31",
    });
    dietSessionIds.push(firstSession.id, secondSession.id);
    const educationQuestions = await Promise.all([
      createGeneralQuestion(firstSession.id, "教育🏫", "2026-02-18"),
      createGeneralQuestion(firstSession.id, "教育🏫", "2026-02-20"),
    ]);
    const disasterQuestion = await createGeneralQuestion(
      firstSession.id,
      "防災☔",
      "2026-02-19"
    );
    const secondSessionEducationQuestion = await createGeneralQuestion(
      secondSession.id,
      "教育🏫",
      "2026-06-20"
    );
    const draft = await createTestBill({
      diet_session_id: firstSession.id,
      publication_category: "general_question",
      publish_status: "draft",
      major_category: "教育🏫",
    });
    const report = await createTestBill({
      diet_session_id: firstSession.id,
      publication_category: "report",
      publish_status: "published",
      major_category: "教育🏫",
    });
    billIds.push(
      ...educationQuestions.map(({ id }) => id),
      disasterQuestion.id,
      secondSessionEducationQuestion.id,
      draft.id,
      report.id
    );

    const cards = await findPublishedGeneralQuestionCategoryCards(
      [firstSession.id, secondSession.id],
      2026
    );

    expect(cards).toEqual([
      expect.objectContaining({
        categoryId: "education",
        dietSession: expect.objectContaining({ id: secondSession.id }),
        questionCount: 1,
        latestSubmittedDate: "2026-06-20",
      }),
      expect.objectContaining({
        categoryId: "education",
        dietSession: expect.objectContaining({ id: firstSession.id }),
        questionCount: 2,
        latestSubmittedDate: "2026-02-20",
      }),
      expect.objectContaining({
        categoryId: "disaster-prevention",
        dietSession: expect.objectContaining({ id: firstSession.id }),
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
      dietSession: {
        id: session.id,
        name: "令和8年第1回定例会",
        startDate: "2026-01-01",
      },
      contents: {
        normal: { title: "教育環境について" },
        hard: { title: "教育環境について（詳しく）" },
      },
    });
    expect(
      await findPublishedGeneralQuestionReferenceByBillId(bill.id)
    ).toEqual({
      categoryId: "education",
      year: 2026,
      sessionKey: session.slug,
      sessionName: "令和8年第1回定例会",
    });
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
