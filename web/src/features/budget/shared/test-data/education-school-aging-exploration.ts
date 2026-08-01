import { BUDGET_EXPLORATION_CATEGORIES } from "../constants/budget";
import type {
  BudgetExplorationData,
  BudgetExplorationDataset,
  BudgetExplorationProgram,
} from "../types/budget-exploration";

export const TEST_ACTIVE_BUDGET_DATASET = {
  id: "11111111-1111-4111-8111-111111111111",
  fiscalYear: 2026,
  budgetType: "initial_budget",
  schemaVersion: "public-budget-v1",
  currencyUnit: "thousand_yen",
  validationStatus: "PASS",
} satisfies BudgetExplorationDataset;

/**
 * education-school-aging-candidates.csv で approve された13件。
 * 公開サービスと同じく金額降順、同額時はidentity ID順で並べている。
 */
export const APPROVED_EDUCATION_SCHOOL_AGING_PROGRAMS = [
  createProgram(
    "bpi_ade86719922583315962d30cd076758c8266300b40233adc94c7fb2a1e3e721e",
    "中学校改築工事",
    "中学校費",
    "学校施設建設費",
    4_210_841,
    "responds_to"
  ),
  createProgram(
    "bpi_664c16372df8ae4f31a48c463cd71931b75ca32f30231fdddb8ee05bdbfb3d1b",
    "小学校施設改修工事",
    "小学校費",
    "学校施設充実費",
    4_140_518,
    "responds_to"
  ),
  createProgram(
    "bpi_bdf5952754017d246f8fee1bd0e38ed3fbfa7a8fc3db9fb43bfa7b9fb97c0e9e",
    "小学校維持管理",
    "小学校費",
    "学校管理費",
    3_207_961,
    "maintains"
  ),
  createProgram(
    "bpi_99ed3cb8df164fc0a25f1dccdc23b862b739384d9943072616bf4712cb9fb1a2",
    "中学校施設改修工事",
    "中学校費",
    "学校施設充実費",
    2_173_450,
    "responds_to"
  ),
  createProgram(
    "bpi_e01048bab09dca8ac69b46b753ca6831831da04e8d8641dc54d8dc6e4f5f505a",
    "小学校改築工事",
    "小学校費",
    "学校施設建設費",
    1_517_614,
    "responds_to"
  ),
  createProgram(
    "bpi_e960ca518f125183ebd9ccbd9dfbd9fae08ae55924b25b0e7f19494fb7d6f20b",
    "中学校維持管理",
    "中学校費",
    "学校管理費",
    1_239_292,
    "maintains"
  ),
  createProgram(
    "bpi_6d04e0f5d3d040f577adcc9d4a9eaaf498418e0c2c04855a605bbbd84c3d98d4",
    "義務教育施設整備基金積立金",
    "中学校費",
    "学校施設建設費",
    341_460,
    "enables"
  ),
  createProgram(
    "bpi_9cca9350afde1d7f1315f5f1afe668ace359a17896e3fc0b0bf03e0f38399e91",
    "中学校改築事務",
    "中学校費",
    "学校施設建設費",
    295_657,
    "enables"
  ),
  createProgram(
    "bpi_65a519619501c5796422d4df8b697d3c80437e66af8af93e5922b2d65ada964c",
    "小学校改築事務",
    "小学校費",
    "学校施設建設費",
    292_171,
    "enables"
  ),
  createProgram(
    "bpi_727b1b52685ea49b8c24660ff6cbcf9bc9d1f95a9177ffd8b73eed151bdd871a",
    "小学校施設整備事業",
    "小学校費",
    "学校施設充実費",
    230_835,
    "supports"
  ),
  createProgram(
    "bpi_e6d8559a1e67da1c2b48cc522d2d12616cb556c9856dd623c3fb3a34d8d51ed8",
    "中学校施設整備事業",
    "中学校費",
    "学校施設充実費",
    136_213,
    "supports"
  ),
  createProgram(
    "bpi_8b7a3201ee363df3d910a851e7b8307c09aad8d8a205857c9d88ffeb7a51ce47",
    "小学校施設改修事務",
    "小学校費",
    "学校施設充実費",
    57_001,
    "enables"
  ),
  createProgram(
    "bpi_91782de2362afe67d9654be3e27bcc410525d24d231045ce5e1f2ed77ee6a2dd",
    "中学校施設改修事務",
    "中学校費",
    "学校施設充実費",
    29_593,
    "enables"
  ),
] satisfies BudgetExplorationProgram[];

export const EDUCATION_SCHOOL_AGING_EXPLORATION: BudgetExplorationData = {
  activeDataset: TEST_ACTIVE_BUDGET_DATASET,
  availability: "available",
  categories: BUDGET_EXPLORATION_CATEGORIES.map((category, index) => ({
    id: `category-${category.slug}`,
    slug: category.slug,
    name: category.name,
    shortDescription: category.shortDescription,
    sortOrder: index + 1,
    tone: category.tone,
    topics:
      category.slug === "education"
        ? [
            {
              id: "topic-school-aging",
              slug: "school-facility-aging",
              name: "学校施設の老朽化への対応",
              shortDescription:
                "学校施設の維持、改修、改築に関係する予算事業です。",
              topicKind: "problem",
              categorySlugs: ["education"],
              programs: APPROVED_EDUCATION_SCHOOL_AGING_PROGRAMS,
            },
          ]
        : [],
  })),
};

function createProgram(
  budgetProgramIdentityId: string,
  displayProgramName: string,
  kouName: string,
  mokuName: string,
  amountThousandYen: number,
  relationType: BudgetExplorationProgram["relationType"]
): BudgetExplorationProgram {
  return {
    budgetProgramIdentityId,
    displayProgramName,
    accountCode: "general",
    accountName: "一般会計",
    kanName: "教育費",
    kouName,
    mokuName,
    departmentDisplayName: "教育委員会事務局 教育環境課",
    amountThousandYen,
    isZeroAmount: false,
    relationType,
    categorySlugs: ["education"],
  };
}
