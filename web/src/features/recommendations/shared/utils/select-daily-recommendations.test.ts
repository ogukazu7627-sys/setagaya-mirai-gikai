import { describe, expect, it } from "vitest";
import type { RecommendationCandidate } from "../types/recommendation";
import { selectDailyRecommendations } from "./select-daily-recommendations";

const candidate = (
  id: string,
  tags: RecommendationCandidate["tags"]
): RecommendationCandidate => ({ id, tags });

const baseInput = {
  selectedSmallTags: ["不登校支援", "学校改築", "防災情報"] as const,
  selectedParentCategoryIds: ["education", "disaster-prevention"] as const,
  displayedBillIds: new Set<string>(),
  seed: "profile:2026-07-25:1",
};

describe("selectDailyRecommendations", () => {
  it("selects one bill for each selected tag and two parent-category bills", () => {
    const result = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates: [
        candidate("a", ["不登校支援"]),
        candidate("b", ["学校改築"]),
        candidate("c", ["防災情報"]),
        candidate("d", ["教育DX"]),
        candidate("e", ["地域防災"]),
      ],
    });

    expect(result).toHaveLength(5);
    expect(
      result.filter((item) => item.source === "selected-subcategory")
    ).toHaveLength(3);
    expect(
      result.filter((item) => item.source === "parent-category")
    ).toHaveLength(2);
  });

  it("maximizes coverage when one bill has multiple selected tags", () => {
    const result = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates: [
        candidate("shared", ["不登校支援", "学校改築"]),
        candidate("school", ["学校改築"]),
        candidate("disaster", ["防災情報"]),
      ],
    });

    expect(result.map((item) => item.billId).sort()).toEqual([
      "disaster",
      "school",
      "shared",
    ]);
  });

  it("excludes displayed and duplicate bills", () => {
    const result = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      displayedBillIds: new Set(["seen"]),
      candidates: [
        candidate("seen", ["不登校支援"]),
        candidate("fresh", ["学校改築"]),
        candidate("fresh", ["防災情報"]),
      ],
    });

    expect(result.map((item) => item.billId)).toEqual(["fresh"]);
  });

  it("does not fill from unrelated categories when candidates are scarce", () => {
    const result = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates: [
        candidate("education", ["不登校支援"]),
        candidate("unrelated", ["保育所"]),
      ],
    });

    expect(result).toEqual([
      { billId: "education", source: "selected-subcategory" },
    ]);
  });

  it("returns a stable order for the same day and a different order seed", () => {
    const candidates = [
      candidate("a", ["不登校支援"]),
      candidate("b", ["学校改築"]),
      candidate("c", ["防災情報"]),
      candidate("d", ["教育DX"]),
      candidate("e", ["地域防災"]),
    ];
    const first = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates,
    });
    const second = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates,
    });
    const nextDay = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates,
      seed: "profile:2026-07-26:1",
    });

    expect(second).toEqual(first);
    expect(nextDay).not.toEqual(first);
  });

  it("uses only unseen bills on the next day", () => {
    const candidates = [
      candidate("school-a", ["不登校支援"]),
      candidate("school-b", ["不登校支援"]),
      candidate("rebuild-a", ["学校改築"]),
      candidate("rebuild-b", ["学校改築"]),
      candidate("disaster-a", ["防災情報"]),
      candidate("disaster-b", ["防災情報"]),
      candidate("parent-a", ["教育DX"]),
      candidate("parent-b", ["特別支援教育"]),
      candidate("parent-c", ["地域防災"]),
      candidate("parent-d", ["消防・救急"]),
    ];
    const firstDay = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates,
    });
    const nextDay = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates,
      displayedBillIds: new Set(firstDay.map((pick) => pick.billId)),
      seed: "profile:2026-07-26:1",
    });

    expect(firstDay).toHaveLength(5);
    expect(nextDay).toHaveLength(5);
    expect(
      nextDay.some((pick) =>
        firstDay.some((firstPick) => firstPick.billId === pick.billId)
      )
    ).toBe(false);
  });

  it("allows a previously displayed bill only after the history set is cleared", () => {
    const candidates = [candidate("previously-seen", ["不登校支援"])];
    const beforeReset = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates,
      displayedBillIds: new Set(["previously-seen"]),
    });
    const afterReset = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates,
      displayedBillIds: new Set(),
      seed: "profile:2026-07-25:2",
    });

    expect(beforeReset).toEqual([]);
    expect(afterReset).toEqual([
      {
        billId: "previously-seen",
        source: "selected-subcategory",
      },
    ]);
  });
  it("covers only limit-many tags per day when more than five are selected", () => {
    const selectedSmallTags = [
      "不登校支援",
      "学校改築",
      "教育DX",
      "特別支援教育",
      "小学校",
      "中学校",
      "高校",
      "いじめ対策",
    ] as const;
    const candidates = selectedSmallTags.map((tag, index) =>
      candidate(`bill-${index}`, [tag])
    );

    const result = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...selectedSmallTags],
      selectedParentCategoryIds: ["education"],
      candidates,
    });

    expect(result).toHaveLength(5);
    expect(new Set(result.map((pick) => pick.billId)).size).toBe(5);
    for (const pick of result) {
      expect(pick.source).toBe("selected-subcategory");
    }
  });

  it("rotates which of the extra tags appear as the day changes", () => {
    const selectedSmallTags = [
      "不登校支援",
      "学校改築",
      "教育DX",
      "特別支援教育",
      "小学校",
      "中学校",
      "高校",
      "いじめ対策",
    ] as const;
    const candidates = selectedSmallTags.map((tag, index) =>
      candidate(`bill-${index}`, [tag])
    );
    const shared = {
      ...baseInput,
      selectedSmallTags: [...selectedSmallTags],
      selectedParentCategoryIds: ["education"] as string[],
      candidates,
    };

    const days = ["2026-07-25", "2026-07-26", "2026-07-27", "2026-07-28"].map(
      (date) =>
        new Set(
          selectDailyRecommendations({
            ...shared,
            selectedParentCategoryIds: ["education"],
            seed: `profile:${date}:1`,
          }).map((pick) => pick.billId)
        )
    );

    // 日が変われば選ばれる分野の組み合わせも変わる。
    const signatures = new Set(days.map((day) => [...day].sort().join(",")));
    expect(signatures.size).toBeGreaterThan(1);

    // 何日か回せば、後ろの分野にも出番が来る。
    const covered = new Set(days.flatMap((day) => [...day]));
    expect(covered.size).toBeGreaterThan(5);
  });

  it("still works with the minimum of three selected tags", () => {
    const result = selectDailyRecommendations({
      ...baseInput,
      selectedSmallTags: [...baseInput.selectedSmallTags],
      selectedParentCategoryIds: [...baseInput.selectedParentCategoryIds],
      candidates: [
        candidate("a", ["不登校支援"]),
        candidate("b", ["学校改築"]),
        candidate("c", ["防災情報"]),
      ],
    });

    expect(result.map((pick) => pick.billId).sort()).toEqual(["a", "b", "c"]);
  });
});
