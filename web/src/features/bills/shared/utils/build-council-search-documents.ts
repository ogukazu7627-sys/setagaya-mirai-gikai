import type { PublicCommitteeSummary } from "@/features/committees/server/repositories/committee-directory-repository";
import { extractCommitteeName } from "@/features/committees/shared/committee-matching";
import {
  COMMITTEE_KIND_LABELS,
  getCommitteeProfile,
} from "@/features/committees/shared/committee-profiles";
import { RECOMMENDATION_CATEGORY_OPTIONS } from "@/features/recommendations/shared/constants/recommendation-taxonomy";
import type { BillWithContent } from "../types";
import type {
  CouncilSearchBillDocument,
  CouncilSearchBillRow,
  CouncilSearchCommitteeDocument,
} from "../types/council-search";

export function buildCouncilSearchBillDocuments(
  bills: BillWithContent[]
): CouncilSearchBillDocument[] {
  return bills.map((bill) => {
    const category = RECOMMENDATION_CATEGORY_OPTIONS.find(
      (option) =>
        option.label === bill.major_category ||
        bill.tags.some((tag) => tag.major_category === option.label)
    );

    return {
      kind: "bill",
      id: bill.id,
      title: bill.bill_content?.title || bill.name,
      officialName: bill.name,
      summary: bill.bill_content?.summary || "",
      itemType: bill.item_type,
      majorCategoryId: category?.id ?? null,
      majorCategoryLabel: category?.label ?? bill.major_category ?? null,
      committeeName: extractCommitteeName(bill.status_note),
      tags: bill.tags.map((tag) => tag.label),
      submittedDate: bill.submitted_date,
      thumbnailUrl: bill.thumbnail_url,
    };
  });
}

export function buildCouncilSearchBillDocumentsFromRows(
  rows: CouncilSearchBillRow[]
): CouncilSearchBillDocument[] {
  return rows.map((row) => {
    const content = Array.isArray(row.bill_contents)
      ? row.bill_contents[0]
      : row.bill_contents;
    const tags = (row.bills_tags ?? []).flatMap((relation) => {
      const relatedTags = Array.isArray(relation.tags)
        ? relation.tags
        : relation.tags
          ? [relation.tags]
          : [];
      return relatedTags;
    });
    const category = RECOMMENDATION_CATEGORY_OPTIONS.find(
      (option) =>
        option.label === row.major_category ||
        tags.some((tag) => tag.major_category === option.label)
    );

    return {
      kind: "bill",
      id: row.id,
      title: content?.title || row.name,
      officialName: row.name,
      summary: content?.summary || "",
      itemType: row.item_type,
      majorCategoryId: category?.id ?? null,
      majorCategoryLabel: category?.label ?? row.major_category,
      committeeName: extractCommitteeName(row.status_note),
      tags: tags.map((tag) => tag.label),
      submittedDate: row.submitted_date,
      thumbnailUrl: row.thumbnail_url,
    };
  });
}

export function buildCouncilSearchCommitteeDocuments(
  committees: PublicCommitteeSummary[]
): CouncilSearchCommitteeDocument[] {
  return committees.map((committee) => {
    const profile = getCommitteeProfile(committee.name);
    return {
      kind: "committee",
      id: committee.id,
      name: committee.name,
      committeeKindLabel: COMMITTEE_KIND_LABELS[profile.kind],
      summary: profile.summary,
      responsibilities: profile.responsibilities,
    };
  });
}
