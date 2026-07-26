import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { isUuid } from "@/lib/utils/uuid";

type CommitteeMemberRelation = {
  role: string | null;
  sort_order: number;
  councilors:
    | {
        id: string;
        display_name: string;
        icon_url: string | null;
        is_active: boolean;
      }
    | Array<{
        id: string;
        display_name: string;
        icon_url: string | null;
        is_active: boolean;
      }>
    | null;
};

type CommitteeRelation = {
  id: string;
  name: string;
  committee_councilors: CommitteeMemberRelation[] | null;
};

export type PublicCommitteeMember = {
  councilorId: string;
  displayName: string;
  iconUrl: string;
  role: string | null;
  sortOrder: number;
};

export type PublicCommitteeSummary = {
  id: string;
  name: string;
  memberCount: number;
};

export type PublicCommitteeDetail = {
  id: string;
  name: string;
  members: PublicCommitteeMember[];
};

const COMMITTEE_SELECT = `
  id,
  name,
  committee_councilors (
    role,
    sort_order,
    councilors (
      id,
      display_name,
      icon_url,
      is_active
    )
  )
`;

function toMembers(
  relations: CommitteeMemberRelation[] | null
): PublicCommitteeMember[] {
  return (relations ?? [])
    .flatMap((relation) => {
      const councilor = Array.isArray(relation.councilors)
        ? relation.councilors[0]
        : relation.councilors;
      if (!councilor?.is_active || !councilor.icon_url) {
        return [];
      }

      return [
        {
          councilorId: councilor.id,
          displayName: councilor.display_name,
          iconUrl: councilor.icon_url,
          role: relation.role,
          sortOrder: relation.sort_order,
        },
      ];
    })
    .sort((memberA, memberB) => memberA.sortOrder - memberB.sortOrder);
}

export async function findActivePublicCommittees(): Promise<
  PublicCommitteeSummary[]
> {
  if (isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select(COMMITTEE_SELECT)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch public committees: ${error.message}`);
  }

  return ((data ?? []) as unknown as CommitteeRelation[]).map((committee) => ({
    id: committee.id,
    name: committee.name,
    memberCount: toMembers(committee.committee_councilors).length,
  }));
}

export async function findActivePublicCommitteeById(
  committeeId: string
): Promise<PublicCommitteeDetail | null> {
  if (isSetagayaMockMode || !isUuid(committeeId)) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select(COMMITTEE_SELECT)
    .eq("id", committeeId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch public committee: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const committee = data as unknown as CommitteeRelation;
  return {
    id: committee.id,
    name: committee.name,
    members: toMembers(committee.committee_councilors),
  };
}
