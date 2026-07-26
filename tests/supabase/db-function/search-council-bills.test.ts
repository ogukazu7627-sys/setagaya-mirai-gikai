import { afterEach, describe, expect, it } from "vitest";
import { adminClient } from "../utils";

const billIds: string[] = [];
const sessionIds: string[] = [];
const councilorIds: string[] = [];
const tagIds: string[] = [];

afterEach(async () => {
  if (billIds.length > 0) {
    await adminClient.from("bills").delete().in("id", billIds);
    billIds.length = 0;
  }
  if (tagIds.length > 0) {
    await adminClient.from("tags").delete().in("id", tagIds);
    tagIds.length = 0;
  }
  if (councilorIds.length > 0) {
    await adminClient.from("councilors").delete().in("id", councilorIds);
    councilorIds.length = 0;
  }
  if (sessionIds.length > 0) {
    await adminClient.from("diet_sessions").delete().in("id", sessionIds);
    sessionIds.length = 0;
  }
});

describe("search_council_bills()", () => {
  it("今年の公開案件だけをキーワード・意味類似度で順位付けする", async () => {
    const currentSession = await createSession("2026-01-10", "2026-12-20");
    const pastSession = await createSession("2025-01-10", "2025-12-20");
    const disaster = await createBill({
      sessionId: currentSession.id,
      name: "地域防災計画の更新",
      title: "避難所と地域防災を見直します",
      publishStatus: "published",
      itemType: "report",
      majorCategory: "防災☔",
      statusNote: "企画総務常任委員会で報告",
    });
    const childRearing = await createBill({
      sessionId: currentSession.id,
      name: "産後ケア事業の拡充",
      title: "子育て世代の産後支援を拡充します",
      publishStatus: "published",
      itemType: "report",
      majorCategory: "子育て👶",
      statusNote: "福祉保健常任委員会で報告",
    });
    await createBill({
      sessionId: currentSession.id,
      name: "非公開の防災案件",
      title: "非公開の地域防災",
      publishStatus: "draft",
      itemType: "report",
      majorCategory: "防災☔",
      statusNote: "企画総務常任委員会で報告",
    });
    await createBill({
      sessionId: pastSession.id,
      name: "過年度の防災案件",
      title: "過年度の地域防災",
      publishStatus: "published",
      itemType: "report",
      majorCategory: "防災☔",
      statusNote: "企画総務常任委員会で報告",
    });
    await insertChunk(disaster.id, currentSession.id, unitVector(0));
    await insertChunk(childRearing.id, currentSession.id, unitVector(1));

    const keyword = await search({
      queryEmbedding: null,
      queryTerms: ["防災"],
      sessionIds: [currentSession.id],
    });
    expect(keyword.error).toBeNull();
    expect(keyword.data?.map((row) => row.bill_id)).toEqual([disaster.id]);

    const semantic = await search({
      queryEmbedding: unitVector(0),
      queryTerms: [],
      sessionIds: [currentSession.id],
      similarityThreshold: 0.9,
    });
    expect(semantic.error).toBeNull();
    expect(semantic.data?.map((row) => row.bill_id)).toEqual([disaster.id]);
  });

  it("種別・テーマ・委員会と議員発言の構造化条件を適用する", async () => {
    const session = await createSession("2026-02-01", "2026-11-30");
    const disaster = await createBill({
      sessionId: session.id,
      name: "避難所運営の見直し",
      title: "災害時の避難所を改善します",
      publishStatus: "published",
      itemType: "report",
      majorCategory: null,
      statusNote: "企画総務常任委員会で報告",
    });
    const childRearing = await createBill({
      sessionId: session.id,
      name: "保育施設整備の報告",
      title: "保育施設を整備します",
      publishStatus: "published",
      itemType: "report",
      majorCategory: "子育て👶",
      statusNote: "福祉保健常任委員会で報告",
    });
    const tag = await createTag("避難所", "防災☔");
    await adminClient
      .from("bills_tags")
      .insert({ bill_id: disaster.id, tag_id: tag.id });
    const councilor = await createCouncilor();
    const statement = await adminClient
      .from("councilor_bill_statements")
      .insert({
        bill_id: childRearing.id,
        councilor_id: councilor.id,
        councilor_name: councilor.display_name,
        difficulty_level: "normal",
        statement_index: 0,
        raw_heading: `## ${councilor.display_name}`,
        content_md: "保育の受け皿について質問しました。",
        content_text: "保育の受け皿について質問しました。",
      });
    expect(statement.error).toBeNull();

    const filtered = await search({
      queryEmbedding: null,
      queryTerms: ["避難所"],
      sessionIds: [session.id],
      contentType: "report",
      majorCategory: "防災☔",
      committeeName: "企画総務常任委員会",
    });
    expect(filtered.error).toBeNull();
    expect(filtered.data?.map((row) => row.bill_id)).toEqual([disaster.id]);

    const speaker = await search({
      queryEmbedding: null,
      queryTerms: [],
      sessionIds: [session.id],
      councilorIds: [councilor.id],
      councilorNames: [councilor.normalized_name],
    });
    expect(speaker.error).toBeNull();
    expect(speaker.data?.map((row) => row.bill_id)).toEqual([childRearing.id]);
  });

  it("非公開化した案件を索引更新前でも即時除外する", async () => {
    const session = await createSession("2026-03-01", "2026-10-31");
    const bill = await createBill({
      sessionId: session.id,
      name: "公開状態切替テスト",
      title: "防災情報を更新します",
      publishStatus: "published",
      itemType: "report",
      majorCategory: "防災☔",
      statusNote: "企画総務常任委員会で報告",
    });
    await insertChunk(bill.id, session.id, unitVector(0));

    const update = await adminClient
      .from("bills")
      .update({ publish_status: "draft" })
      .eq("id", bill.id);
    expect(update.error).toBeNull();

    const result = await search({
      queryEmbedding: unitVector(0),
      queryTerms: ["防災"],
      sessionIds: [session.id],
    });
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("失敗後に利用可能時刻へ達した索引ジョブを再試行できる", async () => {
    const session = await createSession("2026-04-01", "2026-09-30");
    const bill = await createBill({
      sessionId: session.id,
      name: "索引ジョブ再試行テスト",
      title: "索引ジョブを再試行します",
      publishStatus: "published",
      itemType: "report",
      majorCategory: "行財政🏛️",
      statusNote: "企画総務常任委員会で報告",
    });
    const makeFirst = await adminClient
      .from("council_search_index_jobs")
      .update({
        status: "pending",
        requested_at: "2000-01-01T00:00:00.000Z",
        available_at: "2000-01-01T00:00:00.000Z",
        locked_at: null,
      })
      .eq("bill_id", bill.id);
    expect(makeFirst.error).toBeNull();

    const firstClaim = await adminClient.rpc(
      "claim_council_search_index_jobs",
      { p_limit: 1 }
    );
    expect(firstClaim.error).toBeNull();
    expect(firstClaim.data).toEqual([
      expect.objectContaining({ bill_id: bill.id, attempt_count: 1 }),
    ]);

    const reschedule = await adminClient
      .from("council_search_index_jobs")
      .update({
        status: "pending",
        available_at: "2000-01-01T00:00:00.000Z",
        locked_at: null,
      })
      .eq("bill_id", bill.id);
    expect(reschedule.error).toBeNull();

    const secondClaim = await adminClient.rpc(
      "claim_council_search_index_jobs",
      { p_limit: 1 }
    );
    expect(secondClaim.error).toBeNull();
    expect(secondClaim.data).toEqual([
      expect.objectContaining({ bill_id: bill.id, attempt_count: 2 }),
    ]);
  });
});

async function createSession(startDate: string, endDate: string) {
  const suffix = crypto.randomUUID();
  const result = await adminClient
    .from("diet_sessions")
    .insert({
      name: `議会検索テスト会期-${suffix}`,
      slug: `council-search-${suffix}`,
      start_date: startDate,
      end_date: endDate,
      is_active: false,
    })
    .select()
    .single();
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "session setup failed");
  }
  sessionIds.push(result.data.id);
  return result.data;
}

async function createBill(input: {
  sessionId: string;
  name: string;
  title: string;
  publishStatus: "draft" | "published";
  itemType: "bill" | "report" | "petition" | "question";
  majorCategory: string | null;
  statusNote: string;
}) {
  const billResult = await adminClient
    .from("bills")
    .insert({
      diet_session_id: input.sessionId,
      name: `${input.name}-${crypto.randomUUID()}`,
      originating_house: "HR",
      status: "introduced",
      publish_status: input.publishStatus,
      item_type: input.itemType,
      major_category: input.majorCategory,
      status_note: input.statusNote,
      submitted_date: "2026-07-01",
    })
    .select()
    .single();
  if (billResult.error || !billResult.data) {
    throw new Error(billResult.error?.message ?? "bill setup failed");
  }
  billIds.push(billResult.data.id);

  const contentResult = await adminClient.from("bill_contents").insert({
    bill_id: billResult.data.id,
    difficulty_level: "normal",
    title: input.title,
    summary: `${input.title}の概要`,
    content: `# 具体的な内容\n\n${input.title}について確認します。`,
  });
  if (contentResult.error) {
    throw new Error(contentResult.error.message);
  }
  return billResult.data;
}

async function createTag(label: string, majorCategory: string) {
  const result = await adminClient
    .from("tags")
    .insert({
      label: `${label}-${crypto.randomUUID()}`,
      description: `${label}に関する情報`,
      major_category: majorCategory,
    })
    .select()
    .single();
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "tag setup failed");
  }
  tagIds.push(result.data.id);
  return result.data;
}

async function createCouncilor() {
  const suffix = crypto.randomUUID().slice(0, 8);
  const result = await adminClient
    .from("councilors")
    .insert({
      display_name: `山田 太郎${suffix}`,
      normalized_name: `山田太郎${suffix}`,
      is_active: true,
    })
    .select()
    .single();
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "councilor setup failed");
  }
  councilorIds.push(result.data.id);
  return result.data;
}

async function insertChunk(
  billId: string,
  sessionId: string,
  embedding: string
) {
  const result = await adminClient.from("council_search_chunks").insert({
    bill_id: billId,
    diet_session_id: sessionId,
    chunk_key: "overview",
    chunk_kind: "overview",
    content: `検索索引 ${billId}`,
    normalized_content: `検索索引 ${billId}`,
    item_type: "report",
    embedding,
    content_hash: "a".repeat(64),
    embedding_model: "openai/text-embedding-3-small",
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
}

function unitVector(index: number): string {
  return `[${Array.from({ length: 512 }, (_, current) =>
    current === index ? 1 : 0
  ).join(",")}]`;
}

function search(input: {
  queryEmbedding: string | null;
  queryTerms: string[];
  sessionIds: string[];
  contentType?: "bill" | "report" | "petition" | "question" | null;
  majorCategory?: string | null;
  committeeName?: string | null;
  councilorIds?: string[];
  councilorNames?: string[];
  similarityThreshold?: number;
}) {
  return adminClient.rpc("search_council_bills", {
    p_query_embedding: input.queryEmbedding,
    p_query_terms: input.queryTerms,
    p_diet_session_ids: input.sessionIds,
    p_content_type: input.contentType ?? null,
    p_major_category: input.majorCategory ?? null,
    p_committee_name: input.committeeName ?? null,
    p_councilor_ids: input.councilorIds ?? [],
    p_councilor_names: input.councilorNames ?? [],
    p_similarity_threshold: input.similarityThreshold ?? 0.3,
    p_limit: 50,
  });
}
