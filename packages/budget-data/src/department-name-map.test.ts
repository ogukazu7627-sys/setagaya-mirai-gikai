import { describe, expect, it } from "vitest";
import {
  DEPARTMENT_NAME_MAP_COLUMNS,
  indexDepartmentNameMappings,
  parseDepartmentNameMap,
  renderDepartmentMappingReport,
  validateDepartmentMappingCoverage,
} from "./department-name-map";

const header = DEPARTMENT_NAME_MAP_COLUMNS.join(",");

function mappingCsv(
  rows: string[] = [
    "保政＊国保・年金課,保健福祉政策部,国保・年金課," +
      "保健福祉政策部 国保・年金課,matched,official_pdf,PDF照合",
    "区議会事務局,区議会事務局,,区議会事務局," +
      "already_display,official_csv,公式CSV",
  ],
): string {
  return `${header}\n${rows.join("\n")}\n`;
}

describe("department name map", () => {
  it("matchedとalready_displayを解析する", () => {
    const mappings = parseDepartmentNameMap(mappingCsv());

    expect(mappings).toEqual([
      {
        department_name_raw: "保政＊国保・年金課",
        parent_department_display_name: "保健福祉政策部",
        section_display_name: "国保・年金課",
        department_display_name: "保健福祉政策部 国保・年金課",
        mapping_status: "matched",
        mapping_source: "official_pdf",
        mapping_note: "PDF照合",
      },
      {
        department_name_raw: "区議会事務局",
        parent_department_display_name: "区議会事務局",
        section_display_name: "",
        department_display_name: "区議会事務局",
        mapping_status: "already_display",
        mapping_source: "official_csv",
        mapping_note: "公式CSV",
      },
    ]);
  });

  it("同一raw値の重複を拒否する", () => {
    const row =
      "保政＊国保・年金課,保健福祉政策部,国保・年金課," +
      "保健福祉政策部 国保・年金課,matched,official_pdf,PDF照合";
    expect(() => parseDepartmentNameMap(mappingCsv([row, row]))).toThrow(
      "department_name_rawが重複しています",
    );
  });

  it("＊より後ろの課名変更を拒否する", () => {
    expect(() =>
      parseDepartmentNameMap(
        mappingCsv([
          "保政＊国保・年金課,保健福祉政策部,国保年金課," +
            "保健福祉政策部 国保年金課,matched,official_pdf,PDF照合",
        ]),
      ),
    ).toThrow("＊より後ろの課・担当名が保持されていません");
  });

  it("raw値の不足と未使用マッピングを拒否する", () => {
    const mappings = parseDepartmentNameMap(mappingCsv());

    expect(() =>
      validateDepartmentMappingCoverage(
        ["保政＊国保・年金課", "政策＊財政課"],
        mappings,
      ),
    ).toThrow("部署名マッピングが不足しています");
    expect(() =>
      indexDepartmentNameMappings(
        ["保政＊国保・年金課"],
        mappings,
      ),
    ).toThrow("部署名マッピングに未使用raw値があります");
  });

  it("needs_reviewを空欄のまま保持してレポートに出す", () => {
    const mappings = parseDepartmentNameMap(
      mappingCsv([
        "不明＊担当課,,担当課,,needs_review,manual_config,根拠未確定",
      ]),
    );
    const coverage = validateDepartmentMappingCoverage(
      ["不明＊担当課"],
      mappings,
    );
    const report = renderDepartmentMappingReport({
      mappings,
      programRowCount: 1,
      rawDepartmentNameCount: 1,
      programStatusCounts: {
        matched: 0,
        already_display: 0,
        needs_review: 1,
      },
      phase16RegressionRowCount: 1,
      phase16RegressionColumnCount: 28,
    });

    expect(coverage.needsReviewCount).toBe(1);
    expect(report).toContain("`不明＊担当課`: 根拠未確定");
  });
});
