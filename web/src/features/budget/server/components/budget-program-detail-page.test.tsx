// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BudgetProgramDetail } from "../../shared/types/budget";
import { BudgetProgramDetailPage } from "./budget-program-detail-page";

const detail: BudgetProgramDetail = {
  activeDataset: {
    id: "11111111-1111-4111-8111-111111111111",
    fiscalYear: 2026,
    budgetType: "initial_budget",
    schemaVersion: "public-budget-v1",
    currencyUnit: "thousand_yen",
    manifestSha256: "a".repeat(64),
  },
  identity: {
    budgetProgramIdentityId: "bpi_school",
    fiscalYear: 2026,
    accountCode: "general",
    accountName: "一般会計",
    budgetSide: "expenditure",
    budgetItemKey: "2026_general_expenditure_08_02_06",
    kan: { code: "08", name: "教育費" },
    kou: { code: "02", name: "小学校費" },
    moku: { code: "06", name: "学校施設充実費" },
    displayProgramName: "小学校施設改修工事",
    departmentDisplayName: "教育委員会事務局 教育環境課",
    amountThousandYen: 4_140_518,
    memberGroupCount: 1,
    memberProgramCount: 1,
    relatedRevenueCount: 1,
    hasPublicIdentityResolution: false,
    isZeroAmount: false,
    sourceType: "derived_public",
  },
  memberPrograms: [
    {
      programId: "program-school",
      majorProgramName: "校舎校庭等施設整備・充実費",
      budgetProgramName: "小学校施設改修工事",
      detailProgramName: "小学校施設改修工事",
      departmentDisplayName: "教育委員会事務局 教育環境課",
      amountThousandYen: 4_140_518,
      isZeroAmount: false,
      sourceReference: {
        source_type: "official_csv",
        source_file: "ippansaisyutu.csv",
        source_row_number: 10118,
      },
    },
  ],
  budgetItem: {
    budgetItemKey: "2026_general_expenditure_08_02_06",
    fiscalYear: 2026,
    accountCode: "general",
    accountName: "一般会計",
    budgetSide: "expenditure",
    kan: { code: "08", name: "教育費" },
    kou: { code: "02", name: "小学校費" },
    moku: { code: "06", name: "学校施設充実費" },
    amountThousandYen: 4_428_354,
    validationStatus: "ok",
    isZeroAmount: false,
    dataAvailability: {},
    sourceReferences: [],
  },
  otherPrograms: [
    {
      budgetProgramIdentityId: "bpi_school_admin",
      displayProgramName: "小学校施設改修事務",
      departmentDisplayName: "教育委員会事務局 教育環境課",
      amountThousandYen: 57_001,
      isZeroAmount: false,
    },
  ],
  sections: [
    {
      sectionId: "section-15",
      setsuCode: "15",
      setsuName: "工事請負費",
      amountThousandYen: 4_000_000,
      scope: "budget_item",
      sourceReference: {
        source_type: "official_pdf",
        source_file: "r8tousyoyosanallpage.pdf",
        pdf_page: 200,
      },
    },
  ],
  relatedRevenueDetails: [
    {
      allocationLinkId: "allocation-1",
      targetResolutionLevel: "exact_group",
      relationType: "allocated_to_program",
      amountAttributionStatus: "not_available",
      revenueDetailId: "revenue-1",
      revenueItemKey: "2026_general_revenue_13_02_05",
      accountCode: "general",
      accountName: "一般会計",
      kan: { code: "13", name: "国庫支出金" },
      kou: { code: "02", name: "国庫補助金" },
      moku: { code: "05", name: "教育費補助金" },
      setsu: { code: "22", name: "学校施設環境改善交付金" },
      saisetsu: { code: "15", name: "小学校改修" },
      departmentDisplayName: "教育委員会事務局 教育環境課",
      sourceFundingCategoryName: "国庫支出金",
      fundingNature: "specific",
      currentAmountThousandYen: 999_999,
      sourceReference: {},
      allocationSourceReference: {},
    },
  ],
  publishedTopics: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      slug: "school-facility-aging",
      name: "学校施設の老朽化への対応",
      shortDescription: "学校施設を維持・改修する取組",
      topicKind: "problem",
      relationType: "responds_to",
      explanation:
        "事業名と教育費／小学校費／学校施設充実費の公式分類から関連を確認しました。",
      evidenceLevel: "B_strong_structural",
      evidenceFields: {
        identity_fields: {
          display_program_name: "小学校施設改修工事",
          hierarchy: ["教育費", "小学校費", "学校施設充実費"],
          department_display_name: "教育委員会事務局 教育環境課",
        },
        member_programs: [
          {
            budget_program_name: "小学校施設改修工事",
          },
        ],
      },
      evidenceSourceUrl: null,
      categories: [
        {
          slug: "education",
          name: "教育",
          isPrimary: true,
        },
      ],
    },
  ],
  sourceReferences: [
    {
      source_type: "official_csv",
      source_file: "ippansaisyutu.csv",
      source_row_number: 10118,
    },
  ],
};

describe("BudgetProgramDetailPage", () => {
  it("公式情報と公開済み課題整理を分け、節と歳入の範囲を明示する", () => {
    const { container } = render(
      <BudgetProgramDetailPage
        detail={detail}
        returnContext={{
          categorySlug: "education",
          topicSlug: "school-facility-aging",
        }}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "小学校施設改修工事" })
    ).toBeVisible();
    expect(screen.getAllByText("41億4,051万8千円")).not.toHaveLength(0);
    expect(
      screen.getByText(
        "以下は、この事業が属する予算項目全体の節別内訳です。個別事業だけの内訳ではありません。"
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        "みらい議会では、この事業を「学校施設の老朽化への対応」に関連する予算事業として整理しています。"
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        "事業名と教育費／小学校費／学校施設充実費の公式分類から関連を確認しました。"
      )
    ).toBeVisible();
    expect(
      screen.getByText("公式予算分類：教育費 > 小学校費 > 学校施設充実費")
    ).toBeVisible();
    expect(
      screen.getByText("学校施設環境改善交付金・小学校改修")
    ).toBeVisible();
    expect(screen.queryByText("999,999 千円")).not.toBeInTheDocument();
    expect(screen.queryByText("9億9,999万9千円")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent("999999");
    expect(
      screen.getByText(
        "予算書上で関係が記載された歳入です。事業ごとの配分額は公開資料から確認できません。"
      )
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "「学校施設の老朽化への対応」へ戻る",
      })
    ).toHaveAttribute(
      "href",
      "/budget?category=education&topic=school-facility-aging"
    );
    expect(
      screen.getByRole("link", { name: /小学校施設改修事務/ })
    ).toHaveAttribute(
      "href",
      "/budget/programs/bpi_school_admin?fromCategory=education&fromTopic=school-facility-aging"
    );
    expect(
      screen.getByText("令和8年度当初予算であり、実際の支出額ではありません。")
    ).toBeVisible();
  });

  it("active datasetの年度を当初予算と注意事項へ反映する", () => {
    render(
      <BudgetProgramDetailPage
        detail={{
          ...detail,
          activeDataset: { ...detail.activeDataset, fiscalYear: 2027 },
          identity: { ...detail.identity, fiscalYear: 2027 },
        }}
      />
    );

    expect(screen.getByText("令和9年度当初予算額")).toBeVisible();
    expect(
      screen.getByText("令和9年度当初予算であり、実際の支出額ではありません。")
    ).toBeVisible();
    expect(screen.queryByText(/令和8年度/)).not.toBeInTheDocument();
  });

  it("課題と戻りカテゴリーが不一致なら既知カテゴリーまで戻す", () => {
    render(
      <BudgetProgramDetailPage
        detail={detail}
        returnContext={{
          categorySlug: "daily-life",
          topicSlug: "school-facility-aging",
        }}
      />
    );

    expect(
      screen.getByRole("link", { name: "「暮らし」へ戻る" })
    ).toHaveAttribute("href", "/budget?category=daily-life");
  });

  it("公開済み課題関係がない事業を推測で補わない", () => {
    render(
      <BudgetProgramDetailPage detail={{ ...detail, publishedTopics: [] }} />
    );

    expect(
      screen.getByText("この事業に公開済みの課題・テーマ整理はまだありません。")
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "触れる予算へ戻る" })
    ).toHaveAttribute("href", "/budget");
  });
});
