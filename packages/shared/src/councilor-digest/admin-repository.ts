import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import {
  buildCouncilorDigestBody,
  buildCouncilorDigestSubject,
  type DigestReportItem,
} from "./email-body";

type PendingRecipientRow = {
  id: string;
  interview_report_id: string;
  councilor_id: string;
  share_contact: boolean;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
  councilors: {
    id: string;
    display_name: string;
    councilor_contacts: Array<{
      email: string | null;
      is_delivery_enabled: boolean;
    }> | null;
  } | null;
  interview_report: {
    id: string;
    summary: string | null;
    stance: string | null;
    opinions: unknown;
    created_at: string;
    interview_sessions: {
      interview_configs: {
        bill_id: string;
        bills: {
          id: string;
          name: string;
          bill_contents: Array<{
            title: string;
            difficulty_level: string;
          }> | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

export type CouncilorDigestGroup = {
  councilorId: string;
  councilorName: string;
  email: string | null;
  isDeliveryEnabled: boolean;
  recipientIds: string[];
  subject: string;
  body: string;
  items: DigestReportItem[];
};

export type CouncilorContactRow = {
  councilorId: string;
  councilorName: string;
  email: string | null;
  isDeliveryEnabled: boolean;
};

export type CommitteeMemberRow = {
  councilorId: string;
  councilorName: string;
  sortOrder: number;
};

export type CommitteeWithMembersRow = {
  id: string;
  name: string;
  members: CommitteeMemberRow[];
};

export async function listPendingCouncilorDigestGroups(params: {
  webUrl: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_report_recipients")
    .select(
      `
      id,
      interview_report_id,
      councilor_id,
      share_contact,
      contact_name,
      contact_email,
      created_at,
      councilors(
        id,
        display_name,
        councilor_contacts(email, is_delivery_enabled)
      ),
      interview_report(
        id,
        summary,
        stance,
        opinions,
        created_at,
        interview_sessions(
          interview_configs(
            bill_id,
            bills(
              id,
              name,
              bill_contents(title, difficulty_level)
            )
          )
        )
      )
    `
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pending digests: ${error.message}`);
  }

  const groups = new Map<string, CouncilorDigestGroup>();
  for (const row of (data ?? []) as PendingRecipientRow[]) {
    if (!row.councilors || !row.interview_report) {
      continue;
    }
    const contact = row.councilors.councilor_contacts?.[0] ?? null;
    const item = toDigestItem(row, params.webUrl);
    const existing = groups.get(row.councilor_id);
    if (existing) {
      existing.recipientIds.push(row.id);
      existing.items.push(item);
      existing.subject = buildCouncilorDigestSubject({
        councilorName: existing.councilorName,
        itemCount: existing.items.length,
      });
      existing.body = buildCouncilorDigestBody({
        councilorName: existing.councilorName,
        items: existing.items,
      });
      continue;
    }

    const councilorName = row.councilors.display_name;
    const items = [item];
    groups.set(row.councilor_id, {
      councilorId: row.councilor_id,
      councilorName,
      email: contact?.email ?? null,
      isDeliveryEnabled: contact?.is_delivery_enabled ?? false,
      recipientIds: [row.id],
      subject: buildCouncilorDigestSubject({
        councilorName,
        itemCount: items.length,
      }),
      body: buildCouncilorDigestBody({ councilorName, items }),
      items,
    });
  }

  return [...groups.values()].sort((a, b) =>
    a.councilorName.localeCompare(b.councilorName, "ja")
  );
}

export async function listCouncilorContacts(): Promise<CouncilorContactRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("councilors")
    .select("id, display_name, councilor_contacts(email, is_delivery_enabled)")
    .eq("is_active", true)
    .order("display_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch councilor contacts: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const contact = Array.isArray(row.councilor_contacts)
      ? row.councilor_contacts[0]
      : null;
    return {
      councilorId: row.id,
      councilorName: row.display_name,
      email: contact?.email ?? null,
      isDeliveryEnabled: contact?.is_delivery_enabled ?? false,
    };
  });
}

export async function upsertCouncilorContact(params: {
  councilorId: string;
  email: string | null;
  isDeliveryEnabled: boolean;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("councilor_contacts").upsert({
    councilor_id: params.councilorId,
    email: params.email,
    is_delivery_enabled: params.isDeliveryEnabled,
  });

  if (error) {
    throw new Error(`Failed to upsert councilor contact: ${error.message}`);
  }
}

export async function listCommitteesWithMembers(): Promise<
  CommitteeWithMembersRow[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("committees")
    .select(
      "id, name, committee_councilors(sort_order, councilors(id, display_name))"
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch committees: ${error.message}`);
  }

  return (data ?? []).map((committee) => {
    const memberships = Array.isArray(committee.committee_councilors)
      ? committee.committee_councilors
      : [];
    const members = memberships
      .map((membership) => {
        const councilor = Array.isArray(membership.councilors)
          ? membership.councilors[0]
          : membership.councilors;
        if (!councilor) {
          return null;
        }
        return {
          councilorId: councilor.id,
          councilorName: councilor.display_name,
          sortOrder: membership.sort_order,
        };
      })
      .filter((member): member is CommitteeMemberRow => member !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      id: committee.id,
      name: committee.name,
      members,
    };
  });
}

export async function createCommittee(params: { name: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("committees").insert({
    name: params.name,
    normalized_name: params.name.replace(/\s+/g, ""),
  });

  if (error) {
    throw new Error(`Failed to create committee: ${error.message}`);
  }
}

export async function addCommitteeCouncilor(params: {
  committeeId: string;
  councilorId: string;
}) {
  const supabase = createAdminClient();
  const { data: existing, error: listError } = await supabase
    .from("committee_councilors")
    .select("id")
    .eq("committee_id", params.committeeId)
    .eq("councilor_id", params.councilorId)
    .maybeSingle();

  if (listError) {
    throw new Error(`Failed to check committee member: ${listError.message}`);
  }
  if (existing) {
    return;
  }

  const { count, error: countError } = await supabase
    .from("committee_councilors")
    .select("id", { count: "exact", head: true })
    .eq("committee_id", params.committeeId);

  if (countError) {
    throw new Error(`Failed to count committee members: ${countError.message}`);
  }

  const { error } = await supabase.from("committee_councilors").insert({
    committee_id: params.committeeId,
    councilor_id: params.councilorId,
    sort_order: count ?? 0,
  });

  if (error) {
    throw new Error(`Failed to add committee member: ${error.message}`);
  }
}

export async function removeCommitteeCouncilor(params: {
  committeeId: string;
  councilorId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("committee_councilors")
    .delete()
    .eq("committee_id", params.committeeId)
    .eq("councilor_id", params.councilorId);

  if (error) {
    throw new Error(`Failed to remove committee member: ${error.message}`);
  }
}

export async function markDigestRecipientsSent(params: {
  councilorId: string;
  recipientIds: string[];
  subject: string;
  body: string;
}) {
  const supabase = createAdminClient();
  const { data: batch, error: batchError } = await supabase
    .from("councilor_digest_batches")
    .insert({
      councilor_id: params.councilorId,
      subject: params.subject,
      body: params.body,
      status: "sent",
      marked_sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    throw new Error(
      `Failed to create digest batch: ${batchError?.message ?? "missing batch"}`
    );
  }

  const { error: itemError } = await supabase
    .from("councilor_digest_batch_items")
    .insert(
      params.recipientIds.map((recipientId) => ({
        batch_id: batch.id,
        recipient_id: recipientId,
      }))
    );

  if (itemError) {
    throw new Error(`Failed to create digest items: ${itemError.message}`);
  }

  const { error: updateError } = await supabase
    .from("interview_report_recipients")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .in("id", params.recipientIds);

  if (updateError) {
    throw new Error(`Failed to mark recipients sent: ${updateError.message}`);
  }
}

function toDigestItem(
  row: PendingRecipientRow,
  webUrl: string
): DigestReportItem {
  const report = row.interview_report;
  if (!report) {
    throw new Error("report missing");
  }
  const config = report.interview_sessions?.interview_configs;
  const bill = config?.bills;
  const normalContent = bill?.bill_contents?.find(
    (content) => content.difficulty_level === "normal"
  );
  const billTitle = normalContent?.title ?? bill?.name ?? "案件名未設定";
  const billId = config?.bill_id ?? bill?.id ?? "";

  return {
    reportId: report.id,
    billTitle,
    billUrl: `${webUrl.replace(/\/+$/, "")}/bills/${billId}`,
    summary: report.summary,
    stanceLabel: toStanceLabel(report.stance),
    opinions: parseOpinions(report.opinions),
    contactName: row.share_contact ? row.contact_name : null,
    contactEmail: row.share_contact ? row.contact_email : null,
    createdAt: report.created_at,
  };
}

function toStanceLabel(stance: string | null) {
  if (stance === "for") return "期待";
  if (stance === "against") return "懸念";
  if (stance === "neutral") return "期待＆懸念";
  return "未分類";
}

function parseOpinions(
  value: unknown
): Array<{ title: string; content: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title : "";
      const content = typeof record.content === "string" ? record.content : "";
      return title || content ? { title, content } : null;
    })
    .filter(
      (item): item is { title: string; content: string } => item !== null
    );
}
