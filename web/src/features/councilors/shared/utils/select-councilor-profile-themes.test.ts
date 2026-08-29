import { describe, expect, it } from "vitest";
import { selectCouncilorProfileThemes } from "./select-councilor-profile-themes";

describe("selectCouncilorProfileThemes", () => {
  it("counts known categories and returns at most three themes", () => {
    expect(
      selectCouncilorProfileThemes([
        "福祉🤝",
        "教育🏫",
        "福祉🤝",
        "教育🏫",
        "暮らし🙋",
        "暮らし🙋",
        "暮らし🙋",
        "行財政🏛️",
        "行財政🏛️",
      ])
    ).toEqual([
      { theme: "暮らし", count: 3 },
      { theme: "教育", count: 2 },
      { theme: "福祉", count: 2 },
    ]);
  });

  it("uses the site category order when counts are tied", () => {
    expect(
      selectCouncilorProfileThemes([
        "環境問題🌿",
        "防災☔",
        "教育🏫",
        "環境問題🌿",
        "防災☔",
        "教育🏫",
      ])
    ).toEqual([
      { theme: "教育", count: 2 },
      { theme: "防災", count: 2 },
      { theme: "環境問題", count: 2 },
    ]);
  });

  it("ignores unknown values and honors the minimum count", () => {
    expect(
      selectCouncilorProfileThemes(["予算全体", "未分類", null, "産業💡"], {
        minimumCount: 1,
      })
    ).toEqual([{ theme: "産業", count: 1 }]);
  });
});
