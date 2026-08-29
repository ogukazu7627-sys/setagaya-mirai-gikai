import { describe, expect, it } from "vitest";
import {
  APPROVED_EDUCATION_SCHOOL_AGING_PROGRAMS,
  EDUCATION_SCHOOL_AGING_EXPLORATION,
} from "../test-data/education-school-aging-exploration";
import type {
  BudgetExplorationCategory,
  BudgetExplorationProgram,
  BudgetExplorationTopic,
} from "../types/budget-exploration";
import { buildBudgetMapV2Scene } from "./budget-map-v2-scene";

function createProgram(
  overrides: Partial<BudgetExplorationProgram> = {}
): BudgetExplorationProgram {
  return {
    budgetProgramIdentityId: "identity-1",
    displayProgramName: "小学校施設改修工事",
    accountCode: "general",
    accountName: "一般会計",
    kanName: "教育費",
    kouName: "小学校費",
    mokuName: "学校施設充実費",
    departmentDisplayName: "教育委員会事務局 教育環境課",
    amountThousandYen: 4_140_518,
    isZeroAmount: false,
    relationType: "responds_to",
    categorySlugs: ["education"],
    ...overrides,
  };
}

function createTopic(
  overrides: Partial<BudgetExplorationTopic> = {}
): BudgetExplorationTopic {
  return {
    id: "topic-1",
    slug: "school-facility-aging",
    name: "学校施設の老朽化への対応",
    shortDescription: "学校施設の維持、改修、改築に関係する予算事業です。",
    topicKind: "problem",
    categorySlugs: ["education"],
    programs: [createProgram()],
    ...overrides,
  };
}

function createCategory(
  overrides: Partial<BudgetExplorationCategory> = {}
): BudgetExplorationCategory {
  return {
    id: "category-1",
    slug: "education",
    name: "教育",
    shortDescription: "学校・教育環境・学びの支援",
    sortOrder: 1,
    tone: "cyan",
    topics: [createTopic()],
    ...overrides,
  };
}

const CATEGORY_SLUGS = [
  "education",
  "child-rearing",
  "welfare",
  "urban-development",
  "disaster-prevention",
  "administration-finance",
  "culture-sports",
  "industry",
  "environment",
  "daily-life",
];

function createAllCategories(): BudgetExplorationCategory[] {
  return CATEGORY_SLUGS.map((slug, index) =>
    createCategory({
      id: `category-${slug}`,
      slug,
      name: slug,
      sortOrder: index + 1,
      topics: slug === "education" ? [createTopic()] : [],
    })
  );
}

const baseInput = {
  mode: "desktop" as const,
  withMotionParticles: true,
  programPageIndex: 0,
  programPageSize: 10,
};

describe("buildBudgetMapV2Scene overview", () => {
  it("10分野をリング上に配置し、放射線を1本ずつ引く", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "overview" },
      categories: createAllCategories(),
    });

    expect(scene.kind).toBe("overview");
    expect(scene.categories).toHaveLength(10);
    expect(scene.edges).toHaveLength(10);
    expect(scene.world).toEqual({ width: 1000, height: 620 });
  });

  it("分野の並び順は既定の10分野の固定順になる", () => {
    const shuffled = [...createAllCategories()].reverse();
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "overview" },
      categories: shuffled,
    });

    expect(scene.categories.map((category) => category.slug)).toEqual(
      CATEGORY_SLUGS
    );
  });

  it("未知の分野は末尾へ送り、既定色相を割り当てる", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "overview" },
      categories: [
        createCategory({ slug: "unknown", name: "未知", sortOrder: 99 }),
        createCategory({ slug: "education", name: "教育", sortOrder: 1 }),
      ],
    });

    expect(scene.categories.map((category) => category.slug)).toEqual([
      "education",
      "unknown",
    ]);
    expect(scene.categories[1]?.hue).toBe(220);
  });

  it("課題0件の分野も件数0として残す", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "overview" },
      categories: createAllCategories(),
    });

    expect(
      scene.categories.find((category) => category.slug === "welfare")
        ?.topicCount
    ).toBe(0);
    expect(scene.categories).toHaveLength(10);
  });

  it("見出しは中心コアの真下に置く", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "overview" },
      categories: createAllCategories(),
    });

    expect(scene.captionCenter.x).toBe(scene.coreCenter.x);
    expect(scene.captionCenter.y).toBe(scene.coreCenter.y + 89);
  });

  it("overview は中実コアを持たず粒子球体だけを描く", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "overview" },
      categories: createAllCategories(),
    });

    expect(scene.solidCoreDiameter).toBeNull();
    expect(scene.coreDots).toHaveLength(560);
  });

  it("reduced-motion では流れる粒を作らない", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      withMotionParticles: false,
      view: { kind: "overview" },
      categories: createAllCategories(),
    });

    expect(scene.flow).toEqual([]);
  });

  it("分野が0件でも例外にならない", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "overview" },
      categories: [],
    });

    expect(scene.categories).toEqual([]);
    expect(scene.edges).toEqual([]);
  });
});

describe("buildBudgetMapV2Scene category", () => {
  it("公開中の課題だけを配置し、他分野を遠景に残さない", () => {
    const categories = createAllCategories();
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: {
        kind: "category",
        category: categories[0] as BudgetExplorationCategory,
      },
      categories,
    });

    expect(scene.kind).toBe("category");
    expect(scene.topics).toHaveLength(1);
    expect(scene.distantCategories).toEqual([]);
    expect(scene.solidCoreDiameter).toBe(148);
    expect(scene.captionCenter).toEqual(scene.coreCenter);
  });

  it("mobile では遠景の他分野を出さない", () => {
    const categories = createAllCategories();
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      mode: "mobile",
      view: {
        kind: "category",
        category: categories[0] as BudgetExplorationCategory,
      },
      categories,
    });

    expect(scene.distantCategories).toEqual([]);
    expect(scene.solidCoreDiameter).toBeNull();
    expect(scene.captionCenter).toEqual(scene.coreCenter);
  });

  it("課題0件でも架空の課題で埋めない", () => {
    const empty = createCategory({ topics: [] });
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "category", category: empty },
      categories: [empty],
    });

    expect(scene.topics).toEqual([]);
    expect(scene.edges).toEqual([]);
    expect(scene.flow).toEqual([]);
  });
});

describe("buildBudgetMapV2Scene topic", () => {
  const programs = [
    createProgram({
      budgetProgramIdentityId: "p1",
      amountThousandYen: 4_210_841,
    }),
    createProgram({
      budgetProgramIdentityId: "p2",
      amountThousandYen: 1_517_614,
    }),
    createProgram({
      budgetProgramIdentityId: "p3",
      amountThousandYen: 0,
      isZeroAmount: true,
    }),
  ];
  const category = createCategory({
    topics: [createTopic({ programs })],
  });
  const topic = category.topics[0] as BudgetExplorationTopic;

  it("事業を配置し、金額で3段のサイズを割り当てる", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "topic", category, topic },
      categories: [category],
    });

    expect(scene.programs).toHaveLength(3);
    expect(scene.programs[0]?.tier).toBe("high");
    expect(scene.programs[0]?.diameter).toBe(56);
    expect(scene.programs[1]?.tier).toBe("mid");
    expect(scene.programs[2]?.tier).toBe("low");
  });

  it("0円の事業も非表示にしない", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "topic", category, topic },
      categories: [category],
    });

    const zeroProgram = scene.programs.find(
      (program) => program.budgetProgramIdentityId === "p3"
    );

    expect(zeroProgram).toBeDefined();
    expect(zeroProgram?.isZeroAmount).toBe(true);
    expect(zeroProgram?.amountThousandYen).toBe(0);
  });

  it("ページサイズを超える事業はページ送りに回す", () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      createProgram({
        budgetProgramIdentityId: `many-${index}`,
        amountThousandYen: 1000 * (index + 1),
      })
    );
    const manyTopic = createTopic({ programs: many });
    const manyCategory = createCategory({ topics: [manyTopic] });

    const firstPage = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "topic", category: manyCategory, topic: manyTopic },
      categories: [manyCategory],
    });
    const secondPage = buildBudgetMapV2Scene({
      ...baseInput,
      programPageIndex: 1,
      view: { kind: "topic", category: manyCategory, topic: manyTopic },
      categories: [manyCategory],
    });

    expect(firstPage.programs).toHaveLength(10);
    expect(firstPage.programPage).toMatchObject({
      pageIndex: 0,
      pageCount: 2,
      startNumber: 1,
      endNumber: 10,
      totalCount: 14,
    });
    expect(secondPage.programs).toHaveLength(4);
    expect(secondPage.programPage).toMatchObject({
      pageIndex: 1,
      startNumber: 11,
      endNumber: 14,
    });
  });

  it("承認済み13事業を実データ順の10件と3件へ変換する", () => {
    const approvedCategory = EDUCATION_SCHOOL_AGING_EXPLORATION.categories[0];
    const approvedTopic = approvedCategory?.topics[0];
    if (!approvedCategory || !approvedTopic) {
      throw new Error("approved exploration fixture is missing");
    }

    const firstPage = buildBudgetMapV2Scene({
      ...baseInput,
      view: {
        kind: "topic",
        category: approvedCategory,
        topic: approvedTopic,
      },
      categories: EDUCATION_SCHOOL_AGING_EXPLORATION.categories,
    });
    const secondPage = buildBudgetMapV2Scene({
      ...baseInput,
      programPageIndex: 1,
      view: {
        kind: "topic",
        category: approvedCategory,
        topic: approvedTopic,
      },
      categories: EDUCATION_SCHOOL_AGING_EXPLORATION.categories,
    });

    expect(APPROVED_EDUCATION_SCHOOL_AGING_PROGRAMS).toHaveLength(13);
    expect(firstPage.programs).toHaveLength(10);
    expect(secondPage.programs).toHaveLength(3);
    expect(
      [...firstPage.programs, ...secondPage.programs].map(
        (program) => program.budgetProgramIdentityId
      )
    ).toEqual(
      APPROVED_EDUCATION_SCHOOL_AGING_PROGRAMS.map(
        (program) => program.budgetProgramIdentityId
      )
    );
    expect(
      APPROVED_EDUCATION_SCHOOL_AGING_PROGRAMS.reduce(
        (sum, program) => sum + program.amountThousandYen,
        0
      )
    ).toBe(17_872_606);
  });

  it("mobile topic の見出しは事業ノードの手前で収まる", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      mode: "mobile",
      programPageSize: 4,
      view: { kind: "topic", category, topic },
      categories: [category],
    });

    // 先頭の事業ノードは y=262。見出しがそこへ食い込まないこと。
    expect(scene.captionCenter.y).toBe(178);
    expect(scene.captionCenter.y).toBeLessThan(238);
  });

  it("mobile は4件までを2列2段グリッドに置く", () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      createProgram({ budgetProgramIdentityId: `m-${index}` })
    );
    const manyTopic = createTopic({ programs: many });
    const manyCategory = createCategory({ topics: [manyTopic] });

    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      mode: "mobile",
      programPageSize: 4,
      view: { kind: "topic", category: manyCategory, topic: manyTopic },
      categories: [manyCategory],
    });

    expect(scene.programs).toHaveLength(4);
    expect(scene.programs[0]).toMatchObject({ x: 96, y: 262 });
  });

  it("他分野バッジには現在の分野を含めない", () => {
    const crossProgram = createProgram({
      budgetProgramIdentityId: "cross",
      categorySlugs: ["education", "welfare"],
    });
    const crossTopic = createTopic({ programs: [crossProgram] });
    const crossCategory = createCategory({ topics: [crossTopic] });
    const welfare = createCategory({
      id: "category-welfare",
      slug: "welfare",
      name: "福祉",
      topics: [],
    });

    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "topic", category: crossCategory, topic: crossTopic },
      categories: [crossCategory, welfare],
    });

    expect(scene.programs[0]?.otherCategoryNames).toEqual(["福祉"]);
  });

  it("事業0件でも例外にならない", () => {
    const emptyTopic = createTopic({ programs: [] });
    const emptyCategory = createCategory({ topics: [emptyTopic] });

    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "topic", category: emptyCategory, topic: emptyTopic },
      categories: [emptyCategory],
    });

    expect(scene.programs).toEqual([]);
    expect(scene.programPage?.totalCount).toBe(0);
  });

  it("topic の world は縦に広い", () => {
    const scene = buildBudgetMapV2Scene({
      ...baseInput,
      view: { kind: "topic", category, topic },
      categories: [category],
    });

    expect(scene.world).toEqual({ width: 1000, height: 700 });
    expect(scene.solidCoreDiameter).toBe(126);
  });
});
