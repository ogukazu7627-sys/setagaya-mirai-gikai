import { randomUUID } from "node:crypto";
import {
  adminClient,
  cleanupTestBill,
  createTestBill,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
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

afterEach(async () => {
  await Promise.all(Array.from(billIds, cleanupTestBill));
  billIds.clear();

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

  it("counts and returns statements from published bills only", async () => {
    const councilor = await createCouncilor();
    const publishedBill = await createTestBill({
      publish_status: "published",
    });
    const draftBill = await createTestBill({ publish_status: "draft" });
    billIds.add(publishedBill.id);
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
        { ...statementBase, bill_id: publishedBill.id },
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
        ?.statementCount
    ).toBe(1);
    expect(selectedCounts).toEqual([
      {
        councilorId: councilor.id,
        statementCount: 1,
      },
    ]);
    expect(details.map(({ bill_id }) => bill_id)).toEqual([publishedBill.id]);
  });
});
