import "server-only";

import {
  addCommitteeCouncilor,
  type CouncilorDigestGroup,
  createCommittee,
  listCommitteesWithMembers,
  listCouncilorContacts,
  listPendingCouncilorDigestGroups as listSharedPendingCouncilorDigestGroups,
  markDigestRecipientsSent,
  removeCommitteeCouncilor,
  upsertCouncilorContact,
} from "@mirai-gikai/shared/councilor-digest/admin-repository";
import { env } from "@/lib/env";

export type {
  CommitteeMemberRow,
  CommitteeWithMembersRow,
  CouncilorContactRow,
  CouncilorDigestGroup,
} from "@mirai-gikai/shared/councilor-digest/admin-repository";

export async function listPendingCouncilorDigestGroups(): Promise<
  CouncilorDigestGroup[]
> {
  return listSharedPendingCouncilorDigestGroups({ webUrl: env.webUrl });
}

export {
  addCommitteeCouncilor,
  createCommittee,
  listCommitteesWithMembers,
  listCouncilorContacts,
  markDigestRecipientsSent,
  removeCommitteeCouncilor,
  upsertCouncilorContact,
};
