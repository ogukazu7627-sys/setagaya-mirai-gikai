import { describe, expect, it } from "vitest";
import {
  extractCommitteeName,
  extractQuestionerName,
  isCommitteeNameMatch,
  normalizeCommitteeName,
  normalizeJapaneseName,
} from "./candidate-utils";

describe("councilor digest candidate utils", () => {
  it("normalizes councilor suffix and whitespace", () => {
    expect(normalizeJapaneseName(" 中里 光夫 議員 ")).toBe("中里光夫");
  });

  it("extracts questioner names from status notes", () => {
    expect(extractQuestionerName("本会議で中里光夫議員が質問")).toBe(
      "中里光夫"
    );
    expect(extractQuestionerName("田中優子議員が一般質問")).toBe("田中優子");
  });

  it("extracts committee names from parenthesized notes", () => {
    expect(extractCommitteeName("委員会で報告済み（文教常任委員会）")).toBe(
      "文教常任委員会"
    );
    expect(extractCommitteeName("付託委員会: 福祉保健常任委員会")).toBe(
      "福祉保健常任委員会"
    );
  });

  it("extracts committee names with separators from status notes", () => {
    expect(
      extractCommitteeName(
        "2026-02-05　環境・清掃・リサイクル対策等特別委員会で報告済"
      )
    ).toBe("環境・清掃・リサイクル対策等特別委員会");
  });

  it("normalizes committee name separators and small wording differences", () => {
    expect(
      normalizeCommitteeName(" 環境・清掃・リサイクル対策等特別委員会 ")
    ).toBe("環境清掃リサイクル対策特別委員会");
  });

  it("matches committee names with common notation differences", () => {
    expect(
      isCommitteeNameMatch(
        "環境・清掃・リサイクル対策等特別委員会",
        "環境清掃リサイクル対策特別委員会"
      )
    ).toBe(true);
  });
});
