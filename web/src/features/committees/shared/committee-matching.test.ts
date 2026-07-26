import { describe, expect, it } from "vitest";
import {
  extractCommitteeName,
  getCommitteeSearchTerm,
  statusNoteMatchesCommittee,
} from "./committee-matching";

describe("committee matching", () => {
  it("matches full and abbreviated committee names", () => {
    expect(
      statusNoteMatchesCommittee(
        "全員賛成で可決（文教常任委員会）",
        "文教常任委員会"
      )
    ).toBe(true);
    expect(
      statusNoteMatchesCommittee("文教委員会へ付託", "文教常任委員会")
    ).toBe(true);
  });

  it("extracts the canonical committee name for search", () => {
    expect(extractCommitteeName("福祉保健常任委員会で継続審査")).toBe(
      "福祉保健常任委員会"
    );
  });

  it("builds a broad but committee-specific database search term", () => {
    expect(getCommitteeSearchTerm("都市整備常任委員会")).toBe("都市整備");
    expect(getCommitteeSearchTerm("子ども・若者施策推進特別委員会")).toBe(
      "子ども・若者施策推進"
    );
  });
});
