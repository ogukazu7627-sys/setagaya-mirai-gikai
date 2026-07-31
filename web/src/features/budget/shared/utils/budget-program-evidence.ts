import type { Json } from "@mirai-gikai/supabase";

export function describeBudgetProgramEvidenceFields(
  evidenceFields: Json
): string[] {
  const evidence = readJsonObject(evidenceFields);
  if (!evidence) {
    return [];
  }

  const identityFields = readJsonObject(evidence.identity_fields);
  const items: string[] = [];
  const displayProgramName = readString(identityFields?.display_program_name);
  if (displayProgramName) {
    items.push(`事業名：${displayProgramName}`);
  }

  const hierarchy = readStringArray(identityFields?.hierarchy);
  if (hierarchy.length > 0) {
    items.push(`公式予算分類：${hierarchy.join(" > ")}`);
  }

  const departmentDisplayName = readString(
    identityFields?.department_display_name
  );
  if (departmentDisplayName) {
    items.push(`担当部署：${departmentDisplayName}`);
  }

  const memberProgramNames = readJsonArray(evidence.member_programs)
    .map((member) => readJsonObject(member))
    .flatMap((member) => {
      const name =
        readString(member?.detail_program_name) ||
        readString(member?.budget_program_name) ||
        readString(member?.major_program_name);
      return name ? [name] : [];
    });
  if (memberProgramNames.length > 0) {
    items.push(`内部の事業明細：${memberProgramNames.join("、")}`);
  }

  const otherProgramNames = readStringArray(
    evidence.same_budget_item_other_program_names
  );
  if (otherProgramNames.length > 0) {
    items.push(`同じ目の他事業：${otherProgramNames.join("、")}`);
  }

  const relatedRevenueCount = readJsonArray(evidence.related_revenues).length;
  if (relatedRevenueCount > 0) {
    items.push(`関連歳入の記載：${relatedRevenueCount}件`);
  }

  return [...new Set(items)];
}

function readJsonObject(
  value: Json | undefined
): { [key: string]: Json | undefined } | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : null;
}

function readJsonArray(value: Json | undefined): Json[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: Json | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: Json | undefined): string[] {
  return readJsonArray(value).map(readString).filter(Boolean);
}
