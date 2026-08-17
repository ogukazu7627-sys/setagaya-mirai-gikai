import "server-only";

import type { createAdminClient } from "@mirai-gikai/supabase";
import { extractCouncilorStatementsFromMarkdown } from "@/lib/markdown/extract-councilor-statements";
import { getBudgetQuestionCategoryByMajorCategory } from "../../shared/constants/budget-question-categories";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;

export type BudgetQuestionPublicationCouncilor = {
  id: string;
  displayName: string;
  iconUrl: string;
};

export type BudgetQuestionPublicationValidation =
  | {
      ok: true;
      councilor: BudgetQuestionPublicationCouncilor;
    }
  | {
      ok: false;
      code:
        | "budget_councilor_missing"
        | "budget_councilor_multiple"
        | "budget_councilor_unregistered"
        | "budget_councilor_inactive"
        | "budget_councilor_photo_missing"
        | "budget_major_category_invalid";
      message: string;
    };

export type BudgetQuestionPublicationInput = {
  key: string;
  majorCategory: string | null;
  normalContent: string;
};

export async function validateBudgetQuestionPublication({
  normalContent,
  majorCategory,
  supabase,
}: {
  normalContent: string;
  majorCategory: string | null;
  supabase: AdminSupabaseClient;
}): Promise<BudgetQuestionPublicationValidation> {
  const validations = await validateBudgetQuestionPublications({
    inputs: [{ key: "single", majorCategory, normalContent }],
    supabase,
  });
  const validation = validations.get("single");
  if (!validation) {
    throw new Error("Failed to validate budget question councilor");
  }
  return validation;
}

export async function validateBudgetQuestionPublications({
  inputs,
  supabase,
}: {
  inputs: readonly BudgetQuestionPublicationInput[];
  supabase: AdminSupabaseClient;
}): Promise<Map<string, BudgetQuestionPublicationValidation>> {
  const parsed = inputs.map((input) => ({
    ...input,
    statements: extractCouncilorStatementsFromMarkdown(input.normalContent),
  }));
  const councilorNames = Array.from(
    new Set(
      parsed.flatMap(({ statements }) =>
        statements.length === 1 ? [statements[0]?.councilorName ?? ""] : []
      )
    )
  ).filter(Boolean);
  const councilorByName = new Map<
    string,
    {
      id: string;
      display_name: string;
      icon_url: string | null;
      is_active: boolean;
    }
  >();

  if (councilorNames.length > 0) {
    const { data, error } = await supabase
      .from("councilors")
      .select("id, display_name, normalized_name, icon_url, is_active")
      .in("normalized_name", councilorNames);
    if (error) {
      throw new Error(
        `Failed to validate budget question councilors: ${error.message}`
      );
    }
    for (const councilor of data ?? []) {
      councilorByName.set(councilor.normalized_name, councilor);
    }
  }

  return new Map(
    parsed.map(({ key, majorCategory, statements }) => [
      key,
      validateParsedBudgetQuestionStatements(
        majorCategory,
        statements,
        councilorByName
      ),
    ])
  );
}

function validateParsedBudgetQuestionStatements(
  majorCategory: string | null,
  statements: ReturnType<typeof extractCouncilorStatementsFromMarkdown>,
  councilorByName: ReadonlyMap<
    string,
    {
      id: string;
      display_name: string;
      icon_url: string | null;
      is_active: boolean;
    }
  >
): BudgetQuestionPublicationValidation {
  if (!getBudgetQuestionCategoryByMajorCategory(majorCategory)) {
    return {
      ok: false,
      code: "budget_major_category_invalid",
      message:
        "予算案件を公開するには、公開対象の大分類（予算全体または10分類）を選択してください。",
    };
  }

  if (statements.length === 0) {
    return {
      ok: false,
      code: "budget_councilor_missing",
      message:
        "予算案件を公開するには、normal本文の「議員、会派の意見」に顔写真登録済みの議員を1人記載してください。",
    };
  }
  if (statements.length > 1) {
    return {
      ok: false,
      code: "budget_councilor_multiple",
      message:
        "予算案件1件に記載できる議員は1人だけです。normal本文の「議員、会派の意見」を1人に絞ってください。",
    };
  }

  const councilorName = statements[0]?.councilorName ?? "";
  const councilor = councilorByName.get(councilorName);
  if (!councilor) {
    return {
      ok: false,
      code: "budget_councilor_unregistered",
      message: `「${councilorName}」は議員DBの登録済み議員と1件に一致しません。会派名ではなく議員1人の見出しを記載してください。`,
    };
  }
  if (!councilor.is_active) {
    return {
      ok: false,
      code: "budget_councilor_inactive",
      message: `「${councilor.display_name}」は現在の公開対象議員ではありません。`,
    };
  }
  if (!councilor.icon_url) {
    return {
      ok: false,
      code: "budget_councilor_photo_missing",
      message: `「${councilor.display_name}」の顔写真が議員DBに登録されていないため、予算案件を公開できません。`,
    };
  }

  return {
    ok: true,
    councilor: {
      id: councilor.id,
      displayName: councilor.display_name,
      iconUrl: councilor.icon_url,
    },
  };
}
