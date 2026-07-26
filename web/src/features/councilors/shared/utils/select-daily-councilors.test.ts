import { describe, expect, it } from "vitest";
import { selectDailyCouncilors } from "./select-daily-councilors";

const councilors = [
  { id: "councilor-1", displayName: "議員1" },
  { id: "councilor-2", displayName: "議員2" },
  { id: "councilor-3", displayName: "議員3" },
  { id: "councilor-4", displayName: "議員4" },
  { id: "councilor-5", displayName: "議員5" },
];

describe("selectDailyCouncilors", () => {
  it("同じ日付では入力順に左右されない同じ3人を返す", () => {
    const date = new Date(2026, 6, 26);

    const selected = selectDailyCouncilors(councilors, date);
    const selectedFromReversed = selectDailyCouncilors(
      [...councilors].reverse(),
      date
    );

    expect(selected).toHaveLength(3);
    expect(selectedFromReversed).toEqual(selected);
    expect(councilors.map(({ id }) => id)).toEqual([
      "councilor-1",
      "councilor-2",
      "councilor-3",
      "councilor-4",
      "councilor-5",
    ]);
  });

  it("日付が変わると紹介する順番を入れ替える", () => {
    const firstDay = selectDailyCouncilors(councilors, new Date(2026, 6, 26));
    const nextDay = selectDailyCouncilors(councilors, new Date(2026, 6, 27));

    expect(nextDay).not.toEqual(firstDay);
  });

  it("件数の上限と0件指定を扱う", () => {
    expect(
      selectDailyCouncilors(councilors, new Date(2026, 6, 26), 10)
    ).toHaveLength(councilors.length);
    expect(selectDailyCouncilors(councilors, new Date(2026, 6, 26), 0)).toEqual(
      []
    );
  });
});
