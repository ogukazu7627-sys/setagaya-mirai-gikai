import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import { PUBLIC_COMMITTEE_NAMES } from "@/features/committees/shared/committee-profiles";
import { isSetagayaMockMode } from "@/lib/setagaya-mock";
import { isUuid } from "@/lib/utils/uuid";

export type PublicCouncilorCommittee = {
  id: string;
  name: string;
  role: string | null;
};

export type PublicCouncilor = {
  id: string;
  displayName: string;
  normalizedName: string;
  iconUrl: string;
  committees: PublicCouncilorCommittee[];
};

type CouncilorCommitteeRelation = {
  role: string | null;
  sort_order: number;
  committees:
    | {
        id: string;
        name: string;
        is_active: boolean;
      }
    | Array<{
        id: string;
        name: string;
        is_active: boolean;
      }>
    | null;
};

type PublicCouncilorRow = {
  id: string;
  display_name: string;
  normalized_name: string;
  icon_url: string | null;
  committee_councilors: CouncilorCommitteeRelation[] | null;
};

const COUNCILOR_SELECT = `
  id,
  display_name,
  normalized_name,
  icon_url,
  committee_councilors (
    role,
    sort_order,
    committees (
      id,
      name,
      is_active
    )
  )
`;

const COMMITTEE_ORDER = new Map(
  PUBLIC_COMMITTEE_NAMES.map((name, index) => [name, index])
);

function toPublicCouncilor(row: PublicCouncilorRow): PublicCouncilor | null {
  if (!row.icon_url) {
    return null;
  }

  const committees = (row.committee_councilors ?? [])
    .flatMap((relation) => {
      const committee = Array.isArray(relation.committees)
        ? relation.committees[0]
        : relation.committees;
      if (!committee?.is_active) {
        return [];
      }

      return [
        {
          id: committee.id,
          name: committee.name,
          role: relation.role,
          sortOrder: relation.sort_order,
        },
      ];
    })
    .sort(
      (committeeA, committeeB) =>
        (COMMITTEE_ORDER.get(committeeA.name) ?? Number.MAX_SAFE_INTEGER) -
          (COMMITTEE_ORDER.get(committeeB.name) ?? Number.MAX_SAFE_INTEGER) ||
        committeeA.sortOrder - committeeB.sortOrder ||
        committeeA.name.localeCompare(committeeB.name, "ja")
    )
    .map(({ sortOrder: _sortOrder, ...committee }) => committee);

  return {
    id: row.id,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    iconUrl: row.icon_url,
    committees,
  };
}

export async function findActivePublicCouncilors(): Promise<PublicCouncilor[]> {
  if (isSetagayaMockMode) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilors")
    .select(COUNCILOR_SELECT)
    .eq("is_active", true)
    .not("icon_url", "is", null)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch public councilors: ${error.message}`);
  }

  return ((data ?? []) as unknown as PublicCouncilorRow[]).flatMap(
    (councilor) => {
      const publicCouncilor = toPublicCouncilor(councilor);
      return publicCouncilor ? [publicCouncilor] : [];
    }
  );
}

export async function findActivePublicCouncilorById(
  councilorId: string
): Promise<PublicCouncilor | null> {
  if (isSetagayaMockMode || !isUuid(councilorId)) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilors")
    .select(COUNCILOR_SELECT)
    .eq("id", councilorId)
    .eq("is_active", true)
    .not("icon_url", "is", null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch public councilor: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return toPublicCouncilor(data as unknown as PublicCouncilorRow);
}
