import "server-only";

import {
  type CandidateSource,
  extractCommitteeName,
  isCommitteeNameMatch,
  uniqueById,
} from "@mirai-gikai/shared/councilor-digest/candidate-utils";
import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  CouncilorRecipientCandidate,
  ReportRecipientSelection,
} from "../../shared/types";

type ReportWithSession = {
  id: string;
  interview_sessions: {
    user_id: string;
    interview_configs: { bill_id: string } | null;
  } | null;
};

type CouncilorRow = {
  id: string;
  display_name: string;
  normalized_name: string;
  icon_url: string | null;
};

type RecipientRow = {
  councilor_id: string;
  share_contact: boolean;
  status: string;
  councilors: CouncilorRow | CouncilorRow[] | null;
};

type CommitteeCouncilorRow = {
  sort_order: number | null;
  councilors: CouncilorRow | CouncilorRow[] | null;
};

type CommitteeRow = {
  name: string;
  normalized_name: string;
  committee_councilors: CommitteeCouncilorRow[] | null;
};

const SOURCE_LABELS: Record<CandidateSource, string> = {
  questioner: "質問者",
  committee_member: "委員会メンバー",
  statement: "関連する議員",
  manual: "全議員",
};

export async function findReportOwnerAndBill(reportId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_report")
    .select("id, interview_sessions(user_id, interview_configs(bill_id))")
    .eq("id", reportId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const report = data as ReportWithSession;
  const session = report.interview_sessions;
  const billId = session?.interview_configs?.bill_id;
  if (!session || !billId) {
    return null;
  }

  return {
    reportId: report.id,
    billId,
    userId: session.user_id,
  };
}

export async function listRecipientCandidates(billId: string) {
  const supabase = createAdminClient();
  const [{ data: bill }, { data: committeeRows }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, status_note")
      .eq("id", billId)
      .maybeSingle(),
    supabase
      .from("committees")
      .select(
        "id, name, normalized_name, committee_councilors(sort_order, councilors(id, display_name, normalized_name, icon_url))"
      )
      .eq("is_active", true),
  ]);

  const committeeName = extractCommitteeName(bill?.status_note);
  if (!committeeName) {
    return [];
  }

  const committee = ((committeeRows ?? []) as CommitteeRow[]).find(
    (row) =>
      isCommitteeNameMatch(committeeName, String(row.normalized_name)) ||
      isCommitteeNameMatch(committeeName, String(row.name))
  );
  const memberRows = Array.isArray(committee?.committee_councilors)
    ? [...committee.committee_councilors].sort(
        (a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100)
      )
    : [];
  const candidates: CouncilorRecipientCandidate[] = [];
  for (const member of memberRows) {
    const councilor = Array.isArray(member.councilors)
      ? member.councilors[0]
      : member.councilors;
    if (councilor?.icon_url) {
      candidates.push(
        toCandidate(councilor as CouncilorRow, "committee_member", true)
      );
    }
  }

  return uniqueById(candidates);
}

export async function listReportRecipients(reportId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_report_recipients")
    .select(
      "councilor_id, share_contact, status, councilors(id, display_name, normalized_name, icon_url)"
    )
    .eq("interview_report_id", reportId);

  if (error) {
    throw new Error(`Failed to fetch report recipients: ${error.message}`);
  }

  return (data ?? []) as RecipientRow[];
}

export async function getReportRecipientSelectionData(params: {
  reportId: string;
  billId: string;
}): Promise<ReportRecipientSelection> {
  const [candidates, recipients] = await Promise.all([
    listRecipientCandidates(params.billId),
    listReportRecipients(params.reportId),
  ]);

  const selectedCouncilors = recipients.flatMap((recipient) => {
    const councilor = Array.isArray(recipient.councilors)
      ? recipient.councilors[0]
      : recipient.councilors;
    if (!councilor?.id) {
      return [];
    }
    return [toCandidate(councilor, "committee_member", true)];
  });

  return {
    candidates,
    selectedCouncilorIds: recipients.map((recipient) => recipient.councilor_id),
    selectedCouncilors,
    shareContact: recipients.some((recipient) => recipient.share_contact),
    alreadySentCouncilorIds: recipients
      .filter((recipient) => recipient.status === "sent")
      .map((recipient) => recipient.councilor_id),
  };
}

export async function replacePendingReportRecipients(params: {
  reportId: string;
  userId: string;
  councilorIds: string[];
  sourceByCouncilorId: Map<string, CandidateSource>;
  shareContact: boolean;
  contactName: string | null;
  contactEmail: string | null;
}) {
  const supabase = createAdminClient();

  const existing = await listReportRecipients(params.reportId);
  const sentIds = new Set(
    existing
      .filter((recipient) => recipient.status === "sent")
      .map((recipient) => recipient.councilor_id)
  );

  const { error: deleteError } = await supabase
    .from("interview_report_recipients")
    .delete()
    .eq("interview_report_id", params.reportId)
    .in("status", ["pending", "included"]);

  if (deleteError) {
    throw new Error(`Failed to replace recipients: ${deleteError.message}`);
  }

  const rows = params.councilorIds
    .filter((id) => !sentIds.has(id))
    .map((councilorId) => ({
      interview_report_id: params.reportId,
      councilor_id: councilorId,
      user_id: params.userId,
      candidate_source:
        params.sourceByCouncilorId.get(councilorId) ?? "committee_member",
      share_contact: params.shareContact,
      contact_name: params.shareContact ? params.contactName : null,
      contact_email: params.shareContact ? params.contactEmail : null,
      status: "pending",
    }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("interview_report_recipients")
    .insert(rows);

  if (error) {
    throw new Error(`Failed to save recipients: ${error.message}`);
  }
}

function toCandidate(
  row: CouncilorRow,
  source: CandidateSource,
  recommended: boolean
): CouncilorRecipientCandidate {
  return {
    id: row.id,
    displayName: row.display_name,
    iconUrl: row.icon_url,
    source,
    sourceLabel: SOURCE_LABELS[source],
    recommended,
  };
}
