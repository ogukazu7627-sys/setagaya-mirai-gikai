import { describe, expect, it } from "vitest";

import {
  getAdminFixedTagGroups,
  getAdminTagMajorCategory,
  getAllowedAdminTagLabels,
  isAllowedAdminTagLabel,
  normalizeAdminTagLabels,
} from "./fixed-admin-tags";

describe("fixed admin tags", () => {
  it("returns selected major category tags and region tags", () => {
    expect(getAdminFixedTagGroups("教育🏫")).toEqual([
      {
        label: "教育🏫",
        tagLabels: [
          "不登校支援",
          "いじめ対策",
          "学校改築",
          "教育DX",
          "特別支援教育",
          "小学校",
          "中学校",
          "高校",
        ],
      },
      {
        label: "地域",
        tagLabels: [
          "北沢エリア",
          "世田谷エリア",
          "玉川エリア",
          "砧エリア",
          "烏山エリア",
        ],
      },
    ]);
  });

  it("allows tags in the selected major category and region only", () => {
    expect(isAllowedAdminTagLabel("不登校支援", "教育🏫")).toBe(true);
    expect(isAllowedAdminTagLabel("北沢エリア", "教育🏫")).toBe(true);
    expect(isAllowedAdminTagLabel("保育所", "教育🏫")).toBe(false);
  });

  it("deduplicates labels and reports invalid labels", () => {
    expect(
      normalizeAdminTagLabels(
        ["不登校支援", " 不登校支援 ", "保育所", "北沢エリア"],
        "教育🏫"
      )
    ).toEqual({
      labels: ["不登校支援", "北沢エリア"],
      invalidLabels: ["保育所"],
    });
  });

  it("maps region tags to the stable region storage category", () => {
    expect(getAdminTagMajorCategory("北沢エリア", "教育🏫")).toBe("暮らし🙋");
  });

  it("includes all requested industry tags", () => {
    expect(getAllowedAdminTagLabels("産業💡")).toEqual(
      expect.arrayContaining(["せたがやPay", "民泊・旅館業", "都市農業"])
    );
  });
});
