import { describe, expect, it } from "vitest";
import type {
  BudgetExplorationCategory,
  BudgetExplorerView,
} from "../types/budget-exploration";
import {
  getBudgetMapCameraFocus,
  getBudgetMapCameraTransform,
  getBudgetMapCategoryLayout,
  getBudgetMapOverviewLayout,
  getBudgetMapTopicLayout,
  getBudgetMapWorldDimensions,
} from "./budget-map-layout";

const education: BudgetExplorationCategory = {
  id: "category-education",
  slug: "education",
  name: "教育",
  shortDescription: "教育分野",
  sortOrder: 1,
  tone: "cyan",
  topics: [
    {
      id: "topic-school-aging",
      slug: "school-facility-aging",
      name: "学校施設の老朽化への対応",
      shortDescription: "学校施設を維持・改修する取組",
      topicKind: "problem",
      categorySlugs: ["education"],
      programs: Array.from({ length: 13 }, (_, index) => ({
        budgetProgramIdentityId: `bpi_${index}`,
        displayProgramName: `事業${index}`,
        accountCode: "general",
        accountName: "一般会計",
        kanName: "教育費",
        kouName: "小学校費",
        mokuName: "学校施設費",
        departmentDisplayName: "教育環境課",
        amountThousandYen: index + 1,
        isZeroAmount: false,
        relationType: "responds_to",
        categorySlugs: ["education"],
      })),
    },
  ],
};

describe("budget map layout", () => {
  it("overviewを必要最小限の決定的なworld座標へ変換する", () => {
    const view = { kind: "overview" } as const;
    const dimensions = getBudgetMapWorldDimensions(view, "desktop");
    const first = getBudgetMapOverviewLayout("desktop", dimensions);
    const second = getBudgetMapOverviewLayout("desktop", dimensions);

    expect(dimensions).toEqual({ width: 1000, height: 620 });
    expect(first).toEqual(second);
    expect(first.topics).toHaveLength(10);
    expect(
      first.topics.every(
        (topic) =>
          topic.x >= 0 &&
          topic.x <= dimensions.width &&
          topic.y >= 0 &&
          topic.y <= dimensions.height
      )
    ).toBe(true);
  });

  it("mobileのcategoryと初期6事業をworld内に重複しない行間で配置する", () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("fixture topic is missing");
    }
    const categoryView = { kind: "category", category: education } as const;
    const topicView = { kind: "topic", category: education, topic } as const;
    const categoryDimensions = getBudgetMapWorldDimensions(
      categoryView,
      "mobile"
    );
    const topicDimensions = getBudgetMapWorldDimensions(topicView, "mobile");
    const categoryLayout = getBudgetMapCategoryLayout(
      education,
      "mobile",
      categoryDimensions
    );
    const visibleProgramIds = topic.programs
      .slice(0, 6)
      .map((program) => program.budgetProgramIdentityId);
    const topicLayout = getBudgetMapTopicLayout(
      visibleProgramIds,
      "mobile",
      topicDimensions
    );

    expect(
      categoryLayout.topics.every(
        (topicPosition) =>
          topicPosition.x - 112 >= 0 &&
          topicPosition.x + 112 <= categoryDimensions.width &&
          topicPosition.y - 48 >= 0 &&
          topicPosition.y + 48 <= categoryDimensions.height
      )
    ).toBe(true);
    expect(topicLayout.programs).toHaveLength(6);
    expect(
      topicLayout.programs.every(
        (program) =>
          program.x - 78 >= 0 &&
          program.x + 78 <= topicDimensions.width &&
          program.y - 44 >= 0 &&
          program.y + 44 <= topicDimensions.height
      )
    ).toBe(true);
    expect(
      new Set(topicLayout.programs.map((program) => program.nodeId)).size
    ).toBe(6);
  });

  it.each([
    {
      mode: "desktop",
      dimensions: { width: 1000, height: 700 },
      programCount: 10,
      programSize: { width: 212, height: 88 },
      topicSize: { width: 288, height: 112 },
    },
    {
      mode: "mobile",
      dimensions: { width: 360, height: 700 },
      programCount: 6,
      programSize: { width: 156, height: 84 },
      topicSize: { width: 272, height: 104 },
    },
  ] as const)("$modeの初期事業と中心課題が重ならない", ({
    dimensions,
    mode,
    programCount,
    programSize,
    topicSize,
  }) => {
    const ids = Array.from(
      { length: programCount },
      (_, index) => `bpi_${index}`
    );
    const layout = getBudgetMapTopicLayout(ids, mode, dimensions);
    const topicRect = getCenteredRect(layout.center, topicSize);
    const programRects = layout.programs.map((program) => ({
      id: program.nodeId,
      rect: getCenteredRect(program, programSize),
    }));

    for (const [index, program] of programRects.entries()) {
      expect(
        rectsOverlap(program.rect, topicRect),
        `${program.id} overlaps topic`
      ).toBe(false);
      for (const otherProgram of programRects.slice(index + 1)) {
        expect(
          rectsOverlap(program.rect, otherProgram.rect),
          `${program.id} overlaps ${otherProgram.id}`
        ).toBe(false);
      }
    }
  });

  it("transitioning時だけ選択ノードへ寄るcamera targetを返す", () => {
    const current = { kind: "overview" } as const;
    const view: BudgetExplorerView = {
      kind: "transitioning",
      current,
      target: { kind: "category", category: education },
    };
    const dimensions = getBudgetMapWorldDimensions(current, "desktop");
    const focus = getBudgetMapCameraFocus(view, "desktop", dimensions);
    const educationPosition = getBudgetMapOverviewLayout(
      "desktop",
      dimensions
    ).topics.find((topic) => topic.id === "education");

    expect(focus).toMatchObject({
      x: educationPosition?.x,
      y: educationPosition?.y,
      zoom: 1.38,
    });
  });

  it("categoryからtopicへ選択したcamera targetを返す", () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("fixture topic is missing");
    }
    const current = { kind: "category", category: education } as const;
    const dimensions = getBudgetMapWorldDimensions(current, "desktop");
    const focus = getBudgetMapCameraFocus(
      {
        kind: "transitioning",
        current,
        target: { kind: "topic", category: education, topic },
      },
      "desktop",
      dimensions
    );
    const topicPosition = getBudgetMapCategoryLayout(
      education,
      "desktop",
      dimensions
    ).topics[0];

    expect(focus).toMatchObject({
      x: topicPosition?.x,
      y: topicPosition?.y,
      zoom: 1.38,
    });
  });

  it("topicからprogramへ選択したcamera targetを返す", () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("fixture topic is missing");
    }
    const current = { kind: "topic", category: education, topic } as const;
    const dimensions = getBudgetMapWorldDimensions(current, "desktop");
    const focus = getBudgetMapCameraFocus(
      {
        kind: "transitioning",
        current,
        target: {
          kind: "program",
          budgetProgramIdentityId: "bpi_4",
        },
      },
      "desktop",
      dimensions
    );
    const programPosition = getBudgetMapTopicLayout(
      topic.programs
        .slice(0, 10)
        .map((program) => program.budgetProgramIdentityId),
      "desktop",
      dimensions
    ).programs.find((program) => program.nodeId === "bpi_4");

    expect(focus).toMatchObject({
      x: programPosition?.x,
      y: programPosition?.y,
      zoom: 1.34,
    });
  });

  it("見つからないprogramと戻る遷移に安全なcamera targetを返す", () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("fixture topic is missing");
    }
    const current = { kind: "topic", category: education, topic } as const;
    const dimensions = getBudgetMapWorldDimensions(current, "desktop");
    const stableFocus = getBudgetMapCameraFocus(current, "desktop", dimensions);
    const missingProgramFocus = getBudgetMapCameraFocus(
      {
        kind: "transitioning",
        current,
        target: {
          kind: "program",
          budgetProgramIdentityId: "bpi_missing",
        },
      },
      "desktop",
      dimensions
    );
    const categoryFocus = getBudgetMapCameraFocus(
      {
        kind: "transitioning",
        current,
        target: { kind: "category", category: education },
      },
      "desktop",
      dimensions
    );

    expect(missingProgramFocus).toEqual(stableFocus);
    expect(categoryFocus).toEqual({
      ...getBudgetMapCategoryLayout(education, "desktop", dimensions).center,
      zoom: 1.2,
    });
  });

  it("viewport中央へtranslate3dできるtransform値を計算する", () => {
    expect(
      getBudgetMapCameraTransform({
        viewportWidth: 1000,
        viewportHeight: 720,
        dimensions: { width: 1000, height: 720 },
        focus: { x: 500, y: 360, zoom: 1 },
      })
    ).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("mobileの安定表示では日本語を12px相当以上に保ってworldを収める", () => {
    const topic = education.topics[0];
    if (!topic) {
      throw new Error("fixture topic is missing");
    }
    const view = { kind: "topic", category: education, topic } as const;
    const dimensions = getBudgetMapWorldDimensions(view, "mobile");
    const focus = getBudgetMapCameraFocus(view, "mobile", dimensions);
    const transform = getBudgetMapCameraTransform({
      viewportWidth: 320,
      viewportHeight: 736,
      dimensions,
      focus,
    });

    expect(transform.x).toBeGreaterThanOrEqual(-0.1);
    expect(transform.y).toBeGreaterThanOrEqual(0);
    expect(
      transform.x + dimensions.width * transform.scale
    ).toBeLessThanOrEqual(320.1);
    expect(
      transform.y + dimensions.height * transform.scale
    ).toBeLessThanOrEqual(736.1);
    expect(transform.scale).toBeGreaterThanOrEqual(0.85);
    expect(14 * transform.scale).toBeGreaterThanOrEqual(12);
  });
});

type Rect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function getCenteredRect(
  position: { x: number; y: number },
  size: { width: number; height: number }
): Rect {
  return {
    left: position.x - size.width / 2,
    right: position.x + size.width / 2,
    top: position.y - size.height / 2,
    bottom: position.y + size.height / 2,
  };
}

function rectsOverlap(first: Rect, second: Rect): boolean {
  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}
