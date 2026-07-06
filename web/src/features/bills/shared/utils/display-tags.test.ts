import { describe, expect, it } from "vitest";
import { getDisplayTags } from "./display-tags";

describe("getDisplayTags", () => {
  it("大分類を先頭に追加し、小分類タグを続ける", () => {
    const tags = getDisplayTags({
      id: "bill-1",
      major_category: "教育🏫",
      tags: [
        { id: "tag-1", label: "学校給食" },
        { id: "tag-2", label: "条例" },
      ],
    });

    expect(tags).toEqual([
      { id: "bill-1-major-category", label: "教育🏫" },
      { id: "tag-1", label: "学校給食" },
      { id: "tag-2", label: "条例" },
    ]);
  });

  it("小分類タグに同じ大分類ラベルがあっても重複表示しない", () => {
    const tags = getDisplayTags({
      id: "bill-1",
      major_category: "教育🏫",
      tags: [
        { id: "tag-1", label: "教育🏫" },
        { id: "tag-2", label: "学校給食" },
      ],
    });

    expect(tags).toEqual([
      { id: "bill-1-major-category", label: "教育🏫" },
      { id: "tag-2", label: "学校給食" },
    ]);
  });
});
