import { describe, expect, it } from "vitest";
import {
  type RawPdfRevenueAllocation,
  type RevenueAllocationSourceOverride,
  type RevenueDetailMatchSource,
  normalizeRevenueAllocationMatchText,
  serializeRevenueAllocationSourceMatches,
  serializeRevenueAllocationSourceOverrides,
  transformRevenueAllocationSourceMatches,
  validateRevenueAllocationSourceMatches,
  validateSerializedRevenueAllocationSourceMatches,
  validateSerializedRevenueAllocationSourceOverrides,
} from "./revenue-allocation-source-matches";

function makeRaw(
  values: Partial<RawPdfRevenueAllocation> = {},
): RawPdfRevenueAllocation {
  return {
    raw_allocation_id: "ra_001",
    source_file: "budget.pdf",
    pdf_page: "1",
    budget_book_page: "1",
    fiscal_year: "2026",
    account_code: "general",
    account_name: "一般会計",
    kan_code: "11",
    kan_name: "款",
    kou_code: "01",
    kou_name: "項",
    moku_code: "01",
    moku_name: "目",
    setsu_code: "01",
    setsu_name: "節",
    saisetsu_code: "01",
    pdf_revenue_detail_name: "歳入細節",
    pdf_department_name: "財務部",
    pdf_revenue_amount_thousand_yen: "100",
    allocation_sequence: "1",
    pdf_target_program_name: "対象事業",
    target_budget_book_page: "200",
    raw_text: "raw",
    parse_status: "parsed",
    parse_note: "",
    ...values,
  };
}

function makeDetail(
  values: Partial<RevenueDetailMatchSource> = {},
): RevenueDetailMatchSource {
  return {
    revenue_detail_id:
      "rd_2026_general_revenue_11_01_01_01_01_001",
    fiscal_year: "2026",
    account_code: "general",
    kan_code: "11",
    kou_code: "01",
    moku_code: "01",
    setsu_code: "01",
    saisetsu_code: "01",
    saisetsu_name: "歳入細節",
    department_name: "財務部",
    current_amount_thousand_yen: 100,
    ...values,
  };
}

function makeOverride(
  values: Partial<RevenueAllocationSourceOverride> = {},
): RevenueAllocationSourceOverride {
  return {
    representative_raw_allocation_id: "ra_001",
    related_raw_allocation_ids: "ra_001",
    account_code: "general",
    kan_code: "11",
    kou_code: "01",
    moku_code: "01",
    setsu_code: "01",
    saisetsu_code: "01",
    pdf_revenue_amount_thousand_yen: "100",
    pdf_department_name: "財務部",
    pdf_revenue_detail_name: "歳入細節",
    candidate_revenue_detail_ids: "",
    selected_revenue_detail_id: "",
    override_note: "",
    ...values,
  };
}

describe("normalizeRevenueAllocationMatchText", () => {
  it("許可された表記揺れだけを正規化する", () => {
    expect(
      normalizeRevenueAllocationMatchText(
        " １２　（保健）＊課･担当‐Ａ\n",
      ),
    ).toBe("12(保健)*課・担当-Ａ");
  });
});

describe("transformRevenueAllocationSourceMatches", () => {
  it("同一階層と金額だけで一意ならmatchedにする", () => {
    const raw = [makeRaw()];
    const details = [makeDetail()];
    const result = transformRevenueAllocationSourceMatches(
      raw,
      details,
    );

    expect(result.matches[0]).toMatchObject({
      revenue_detail_id: details[0].revenue_detail_id,
      source_match_status: "matched",
      source_match_method: "hierarchy_code_amount",
    });
    expect(result.overrideRows).toHaveLength(0);
  });

  it("複数充当先にはsequence=1の判定を引き継ぐ", () => {
    const raw = [
      makeRaw(),
      makeRaw({
        raw_allocation_id: "ra_002",
        allocation_sequence: "2",
        pdf_revenue_amount_thousand_yen: "",
        pdf_target_program_name: "対象事業2",
      }),
    ];
    const result = transformRevenueAllocationSourceMatches(raw, [
      makeDetail(),
    ]);

    expect(result.decisions).toHaveLength(1);
    expect(result.matches).toHaveLength(2);
    expect(result.matches[1].revenue_detail_id).toBe(
      result.matches[0].revenue_detail_id,
    );
    expect(result.matches[1].source_match_note).toContain(
      "inherited_from_allocation_sequence_1=ra_001",
    );
  });

  it("金額候補が複数なら部署名の完全一致で絞る", () => {
    const result = transformRevenueAllocationSourceMatches(
      [makeRaw({ pdf_department_name: "財務部　課税課" })],
      [
        makeDetail({
          revenue_detail_id: "rd_a",
          department_name: "財務部 課税課",
        }),
        makeDetail({
          revenue_detail_id: "rd_b",
          department_name: "政策経営部",
        }),
      ],
    );

    expect(result.matches[0]).toMatchObject({
      revenue_detail_id: "rd_a",
      source_match_status: "matched",
      source_match_method: "hierarchy_code_amount_department",
    });
  });

  it("部署名で決まらない場合は細節名称の完全一致で絞る", () => {
    const result = transformRevenueAllocationSourceMatches(
      [
        makeRaw({
          pdf_department_name: "PDF部署",
          pdf_revenue_detail_name: "施設（本館）使用料",
        }),
      ],
      [
        makeDetail({
          revenue_detail_id: "rd_a",
          department_name: "CSV部署A",
          saisetsu_name: "施設(本館)使用料",
        }),
        makeDetail({
          revenue_detail_id: "rd_b",
          department_name: "CSV部署B",
          saisetsu_name: "施設（別館）使用料",
        }),
      ],
    );

    expect(result.matches[0]).toMatchObject({
      revenue_detail_id: "rd_a",
      source_match_status: "matched",
      source_match_method: "hierarchy_code_name_amount",
    });
  });

  it("許可された完全一致で一意にならなければambiguousにする", () => {
    const result = transformRevenueAllocationSourceMatches(
      [makeRaw({ pdf_department_name: "別部署" })],
      [
        makeDetail({
          revenue_detail_id: "rd_a",
          department_name: "部署A",
          saisetsu_name: "名称A",
        }),
        makeDetail({
          revenue_detail_id: "rd_b",
          department_name: "部署B",
          saisetsu_name: "名称B",
        }),
      ],
    );

    expect(result.matches[0]).toMatchObject({
      revenue_detail_id: "",
      source_match_status: "ambiguous",
      source_match_method: "",
    });
    expect(result.overrideRows).toHaveLength(1);
    expect(
      result.overrideRows[0].candidate_revenue_detail_ids,
    ).toBe("rd_a|rd_b");
  });

  it("同一階層・同一金額候補がなければunmatchedにする", () => {
    const result = transformRevenueAllocationSourceMatches(
      [makeRaw()],
      [
        makeDetail({
          revenue_detail_id: "rd_other_account",
          account_code: "long_term_care_insurance",
        }),
      ],
    );

    expect(result.matches[0].source_match_status).toBe("unmatched");
    expect(result.matches[0].revenue_detail_id).toBe("");
    expect(result.overrideRows).toHaveLength(1);
  });

  it("同一階層内の手動補正だけをmanually_confirmedにする", () => {
    const detail = makeDetail({ current_amount_thousand_yen: 999 });
    const result = transformRevenueAllocationSourceMatches(
      [makeRaw()],
      [detail],
      [
        makeOverride({
          selected_revenue_detail_id: detail.revenue_detail_id,
          override_note: "公式資料で確認",
        }),
      ],
    );

    expect(result.matches[0]).toMatchObject({
      revenue_detail_id: detail.revenue_detail_id,
      source_match_status: "manually_confirmed",
      source_match_method: "manual_override",
      source_match_note: "公式資料で確認",
    });
    expect(result.overrideRows).toHaveLength(1);
  });

  it("階層外への手動補正を拒否する", () => {
    const detail = makeDetail({
      revenue_detail_id: "rd_other",
      moku_code: "02",
    });
    expect(() =>
      transformRevenueAllocationSourceMatches(
        [makeRaw()],
        [detail],
        [
          makeOverride({
            selected_revenue_detail_id: detail.revenue_detail_id,
          }),
        ],
      ),
    ).toThrow("同一会計・同一階層の外");
  });
});

describe("source matchの検証と直列化", () => {
  it("raw列を保持してCSVを再読込検証できる", () => {
    const raw = [makeRaw()];
    const details = [makeDetail()];
    const result = transformRevenueAllocationSourceMatches(
      raw,
      details,
    );
    const validation = validateRevenueAllocationSourceMatches(
      raw,
      details,
      result,
    );
    const matchesCsv = serializeRevenueAllocationSourceMatches(
      result.matches,
    );
    const overridesCsv =
      serializeRevenueAllocationSourceOverrides(result.overrideRows);

    expect(validation.isPass).toBe(true);
    expect(validation.rawValueDifferenceCount).toBe(0);
    expect(() =>
      validateSerializedRevenueAllocationSourceMatches(
        matchesCsv,
        result.matches,
      ),
    ).not.toThrow();
    expect(() =>
      validateSerializedRevenueAllocationSourceOverrides(
        overridesCsv,
        result.overrideRows,
      ),
    ).not.toThrow();
    expect(overridesCsv.trim().split("\n")).toHaveLength(1);
  });
});
