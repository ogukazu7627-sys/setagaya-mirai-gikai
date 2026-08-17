import { describe, expect, it, vi } from "vitest";
import { validateBudgetQuestionPublication } from "./budget-question-publication";

type CouncilorFixture = {
  id: string;
  display_name: string;
  normalized_name: string;
  icon_url: string | null;
  is_active: boolean;
};

function createSupabase(councilors: CouncilorFixture[]) {
  const namesFilter = vi.fn().mockResolvedValue({
    data: councilors,
    error: null,
  });
  const select = vi.fn(() => ({ in: namesFilter }));
  return {
    client: { from: vi.fn(() => ({ select })) },
    namesFilter,
  };
}

function markdown(...headings: string[]): string {
  return `# 議員、会派の意見\n\n${headings
    .map((heading) => `## ${heading}\n\n予算について質問しました。`)
    .join("\n\n")}`;
}

const activeCouncilor: CouncilorFixture = {
  id: "11111111-1111-4111-8111-111111111111",
  display_name: "平塚けいじ",
  normalized_name: "平塚けいじ",
  icon_url: "/icons/councilors/hiratsuka-keiji.jpg",
  is_active: true,
};

describe("validateBudgetQuestionPublication", () => {
  it("顔写真付きの登録議員が1人なら公開可能にする", async () => {
    const { client, namesFilter } = createSupabase([activeCouncilor]);
    const result = await validateBudgetQuestionPublication({
      majorCategory: "教育🏫",
      normalContent: markdown("平塚けいじ議員"),
      supabase: client as never,
    });

    expect(result).toEqual({
      ok: true,
      councilor: {
        id: activeCouncilor.id,
        displayName: activeCouncilor.display_name,
        iconUrl: activeCouncilor.icon_url,
      },
    });
    expect(namesFilter).toHaveBeenCalledWith("normalized_name", ["平塚けいじ"]);
  });

  it("議員0人・複数人・会派だけを拒否する", async () => {
    const emptySupabase = createSupabase([]).client as never;
    await expect(
      validateBudgetQuestionPublication({
        majorCategory: "教育🏫",
        normalContent: "# 概要\n\n本文です。",
        supabase: emptySupabase,
      })
    ).resolves.toMatchObject({ ok: false, code: "budget_councilor_missing" });
    await expect(
      validateBudgetQuestionPublication({
        majorCategory: "教育🏫",
        normalContent: markdown("平塚けいじ議員", "福田たえ美議員"),
        supabase: emptySupabase,
      })
    ).resolves.toMatchObject({ ok: false, code: "budget_councilor_multiple" });
    await expect(
      validateBudgetQuestionPublication({
        majorCategory: "教育🏫",
        normalContent: markdown("自由民主党世田谷区議団"),
        supabase: emptySupabase,
      })
    ).resolves.toMatchObject({
      ok: false,
      code: "budget_councilor_unregistered",
    });
  });

  it("未登録・非公開対象・顔写真なしの議員を拒否する", async () => {
    await expect(
      validateBudgetQuestionPublication({
        majorCategory: "教育🏫",
        normalContent: markdown("未登録議員"),
        supabase: createSupabase([]).client as never,
      })
    ).resolves.toMatchObject({
      ok: false,
      code: "budget_councilor_unregistered",
    });
    await expect(
      validateBudgetQuestionPublication({
        majorCategory: "教育🏫",
        normalContent: markdown("平塚けいじ議員"),
        supabase: createSupabase([{ ...activeCouncilor, is_active: false }])
          .client as never,
      })
    ).resolves.toMatchObject({
      ok: false,
      code: "budget_councilor_inactive",
    });
    await expect(
      validateBudgetQuestionPublication({
        majorCategory: "教育🏫",
        normalContent: markdown("平塚けいじ議員"),
        supabase: createSupabase([{ ...activeCouncilor, icon_url: null }])
          .client as never,
      })
    ).resolves.toMatchObject({
      ok: false,
      code: "budget_councilor_photo_missing",
    });
  });

  it("全体または10分類に含まれない大分類を拒否する", async () => {
    await expect(
      validateBudgetQuestionPublication({
        majorCategory: "未分類",
        normalContent: markdown("平塚けいじ議員"),
        supabase: createSupabase([activeCouncilor]).client as never,
      })
    ).resolves.toMatchObject({
      ok: false,
      code: "budget_major_category_invalid",
    });
  });
});
