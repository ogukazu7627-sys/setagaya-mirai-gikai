import { randomUUID } from "node:crypto";
import { adminClient } from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  findActivePublicCommitteeById,
  findActivePublicCommittees,
} from "./committee-directory-repository";

const committeeIds = new Set<string>();
const councilorIds = new Set<string>();

async function createCommittee(isActive = true) {
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
      display_name: `委員テスト-${suffix}`,
      normalized_name: `委員テスト${suffix}`,
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

describe("committee directory repository", () => {
  it("returns active committees and counts only active members with icons", async () => {
    const committee = await createCommittee();
    const inactiveCommittee = await createCommittee(false);
    const publicMember = await createCouncilor();
    const inactiveMember = await createCouncilor({ isActive: false });
    const iconlessMember = await createCouncilor({ iconUrl: null });

    const { error } = await adminClient.from("committee_councilors").insert([
      {
        committee_id: committee.id,
        councilor_id: publicMember.id,
        role: "委員長",
        sort_order: 2,
      },
      {
        committee_id: committee.id,
        councilor_id: inactiveMember.id,
        sort_order: 0,
      },
      {
        committee_id: committee.id,
        councilor_id: iconlessMember.id,
        sort_order: 1,
      },
    ]);
    if (error) throw new Error(error.message);

    const summaries = await findActivePublicCommittees();
    const summary = summaries.find(({ id }) => id === committee.id);
    const detail = await findActivePublicCommitteeById(committee.id);

    expect(summary).toMatchObject({ id: committee.id, memberCount: 1 });
    expect(summaries.map(({ id }) => id)).not.toContain(inactiveCommittee.id);
    expect(detail?.members).toEqual([
      expect.objectContaining({
        councilorId: publicMember.id,
        role: "委員長",
        sortOrder: 2,
      }),
    ]);
  });

  it("returns null for invalid, missing, and inactive detail IDs", async () => {
    const inactiveCommittee = await createCommittee(false);

    await expect(
      findActivePublicCommitteeById("not-a-uuid")
    ).resolves.toBeNull();
    await expect(
      findActivePublicCommitteeById(randomUUID())
    ).resolves.toBeNull();
    await expect(
      findActivePublicCommitteeById(inactiveCommittee.id)
    ).resolves.toBeNull();
  });
});
