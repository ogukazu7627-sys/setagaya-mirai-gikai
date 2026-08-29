import { randomUUID } from "node:crypto";
import {
  adminClient,
  cleanupTestBill,
  createTestBill,
  createTestBillContent,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import { COUNCILOR_PROFILE_CATALOG } from "../../shared/councilor-profile-catalog";
import {
  findActivePublicCouncilorById,
  findActivePublicCouncilors,
} from "./councilor-directory-repository";
import {
  findPublishedCouncilorStatementCounts,
  findPublishedCouncilorStatementCountsByCouncilorIds,
  findPublishedCouncilorStatementDetails,
} from "./councilor-statement-repository";

const councilorIds = new Set<string>();
const billIds = new Set<string>();
const committeeIds = new Set<string>();

async function createCouncilor({
  isActive = true,
  iconUrl = "https://example.com/councilor.png",
}: {
  isActive?: boolean;
  iconUrl?: string | null;
} = {}) {
  const suffix = randomUUID();
  const { data, error } = await adminClient
    .from("councilors")
    .insert({
      display_name: `公開議員テスト-${suffix}`,
      normalized_name: `公開議員テスト${suffix}`,
      icon_url: iconUrl,
      is_active: isActive,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  councilorIds.add(data.id);
  return data;
}

async function createCommittee({
  isActive = true,
}: {
  isActive?: boolean;
} = {}) {
  const suffix = randomUUID();
  const { data, error } = await adminClient
    .from("committees")
    .insert({
      name: `公開委員会テスト-${suffix}`,
      normalized_name: `公開委員会テスト${suffix}`,
      is_active: isActive,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  committeeIds.add(data.id);
  return data;
}

afterEach(async () => {
  await Promise.all(Array.from(billIds, cleanupTestBill));
  billIds.clear();

  if (committeeIds.size > 0) {
    await adminClient
      .from("committees")
      .delete()
      .in("id", Array.from(committeeIds));
    committeeIds.clear();
  }

  if (councilorIds.size > 0) {
    await adminClient
      .from("councilors")
      .delete()
      .in("id", Array.from(councilorIds));
    councilorIds.clear();
  }
});

describe("councilor directory repository", () => {
  it("returns only active councilors that have public icons", async () => {
    const publicCouncilor = await createCouncilor();
    const inactiveCouncilor = await createCouncilor({ isActive: false });
    const iconlessCouncilor = await createCouncilor({ iconUrl: null });

    const result = await findActivePublicCouncilors();
    const resultIds = result.map(({ id }) => id);

    expect(resultIds).toContain(publicCouncilor.id);
    expect(resultIds).not.toContain(inactiveCouncilor.id);
    expect(resultIds).not.toContain(iconlessCouncilor.id);
    await expect(
      findActivePublicCouncilorById(publicCouncilor.id)
    ).resolves.toMatchObject({ id: publicCouncilor.id });
    await expect(
      findActivePublicCouncilorById(inactiveCouncilor.id)
    ).resolves.toBeNull();
    await expect(
      findActivePublicCouncilorById(iconlessCouncilor.id)
    ).resolves.toBeNull();
  });

  it("returns null for invalid and missing detail IDs", async () => {
    await expect(
      findActivePublicCouncilorById("not-a-uuid")
    ).resolves.toBeNull();
    await expect(
      findActivePublicCouncilorById(randomUUID())
    ).resolves.toBeNull();
  });

  it("returns normalized names and active committee memberships with roles", async () => {
    const councilor = await createCouncilor();
    const secondCommittee = await createCommittee();
    const firstCommittee = await createCommittee();
    const inactiveCommittee = await createCommittee({ isActive: false });
    const { error } = await adminClient.from("committee_councilors").insert([
      {
        committee_id: secondCommittee.id,
        councilor_id: councilor.id,
        role: "委員",
        sort_order: 2,
      },
      {
        committee_id: firstCommittee.id,
        councilor_id: councilor.id,
        role: "副委員長",
        sort_order: 1,
      },
      {
        committee_id: inactiveCommittee.id,
        councilor_id: councilor.id,
        role: "委員長",
        sort_order: 0,
      },
    ]);
    if (error) throw new Error(error.message);

    const result = await findActivePublicCouncilorById(councilor.id);

    expect(result).toMatchObject({
      id: councilor.id,
      normalizedName: councilor.normalized_name,
      committees: [
        {
          id: firstCommittee.id,
          name: firstCommittee.name,
          role: "副委員長",
        },
        {
          id: secondCommittee.id,
          name: secondCommittee.name,
          role: "委員",
        },
      ],
    });
  });

  it("returns the official 2026-08-25 memberships and current faction master", async () => {
    const councilors = await findActivePublicCouncilors();
    expect(
      councilors.map(({ normalizedName }) => normalizedName).sort()
    ).toEqual(
      COUNCILOR_PROFILE_CATALOG.map(
        ({ normalizedName }) => normalizedName
      ).sort()
    );

    const itai = councilors.find(
      ({ normalizedName }) => normalizedName === "いたいひとし"
    );
    const ogino = councilors.find(
      ({ normalizedName }) => normalizedName === "おぎのけんじ"
    );

    expect(itai?.committees).toEqual([
      expect.objectContaining({
        name: "福祉保健常任委員会",
        role: "委員長",
      }),
      expect.objectContaining({
        name: "災害・防犯・オウム問題対策等特別委員会",
        role: "委員",
      }),
    ]);
    expect(ogino?.committees).toEqual([
      expect.objectContaining({ name: "文教常任委員会", role: "委員" }),
      expect.objectContaining({
        name: "子ども・若者施策推進特別委員会",
        role: "委員",
      }),
    ]);

    const { data, error } = await adminClient
      .from("councilors")
      .select("normalized_name, is_active")
      .in("normalized_name", ["世田谷自民の会", "世田谷刷新の会"]);
    if (error) throw new Error(error.message);

    expect(data).toEqual(
      expect.arrayContaining([
        { normalized_name: "世田谷自民の会", is_active: true },
        { normalized_name: "世田谷刷新の会", is_active: false },
      ])
    );
  });

  it("counts published questions by venue but excludes draft bills", async () => {
    const councilor = await createCouncilor();
    const reportBill = await createTestBill({
      publish_status: "published",
      publication_category: "report",
    });
    await createTestBillContent(reportBill.id, {
      difficulty_level: "normal",
      content: "# 議員、会派の意見\n\n## 発言者\n\n### 発言者\n質問です。",
    });
    const generalQuestionBill = await createTestBill({
      publish_status: "published",
      publication_category: "general_question",
    });
    const budgetBill = await createTestBill({
      publish_status: "published",
      publication_category: "budget",
    });
    const draftBill = await createTestBill({ publish_status: "draft" });
    billIds.add(reportBill.id);
    billIds.add(generalQuestionBill.id);
    billIds.add(budgetBill.id);
    billIds.add(draftBill.id);

    const statementBase = {
      content_md: "発言本文",
      content_text: "発言本文",
      councilor_id: councilor.id,
      councilor_name: councilor.display_name,
      difficulty_level: "normal" as const,
      raw_heading: `## ${councilor.display_name}`,
      statement_index: 0,
    };
    const { error } = await adminClient
      .from("councilor_bill_statements")
      .insert([
        { ...statementBase, bill_id: reportBill.id },
        { ...statementBase, bill_id: generalQuestionBill.id },
        { ...statementBase, bill_id: budgetBill.id },
        { ...statementBase, bill_id: draftBill.id },
      ]);
    if (error) throw new Error(error.message);

    const counts = await findPublishedCouncilorStatementCounts();
    const selectedCounts =
      await findPublishedCouncilorStatementCountsByCouncilorIds([councilor.id]);
    const details = await findPublishedCouncilorStatementDetails({
      councilorId: councilor.id,
    });

    expect(
      counts.find(({ councilorId }) => councilorId === councilor.id)
        ?.questionCounts
    ).toEqual({
      total: 3,
      general: 1,
      budget: 1,
      committee: 1,
    });
    expect(selectedCounts).toEqual([
      {
        councilorId: councilor.id,
        questionCounts: {
          total: 3,
          general: 1,
          budget: 1,
          committee: 1,
        },
      },
    ]);
    expect(details.map(({ bill_id }) => bill_id).sort()).toEqual(
      [reportBill.id, generalQuestionBill.id, budgetBill.id].sort()
    );
    expect(
      details.find(({ bill_id }) => bill_id === reportBill.id)
        ?.billNormalContent
    ).toContain("### 発言者");
  });

  it("counts every published question beyond the first Supabase response page", async () => {
    const councilor = await createCouncilor();
    const bill = await createTestBill({
      publish_status: "published",
      publication_category: "report",
    });
    billIds.add(bill.id);

    const rows = Array.from({ length: 1005 }, (_, statementIndex) => ({
      bill_id: bill.id,
      content_md: `発言本文${statementIndex}`,
      content_text: `発言本文${statementIndex}`,
      councilor_id: councilor.id,
      councilor_name: councilor.display_name,
      difficulty_level: "normal" as const,
      raw_heading: `## ${councilor.display_name}`,
      statement_index: statementIndex,
    }));
    const { error } = await adminClient
      .from("councilor_bill_statements")
      .insert(rows);
    if (error) throw new Error(error.message);

    const counts = await findPublishedCouncilorStatementCounts();
    expect(
      counts.find(({ councilorId }) => councilorId === councilor.id)
        ?.questionCounts
    ).toEqual({
      total: 1005,
      general: 0,
      budget: 0,
      committee: 1005,
    });
  });
});
