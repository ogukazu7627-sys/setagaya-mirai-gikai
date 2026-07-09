import { describe, expect, it } from "vitest";
import { buildCouncilorStatementRows } from "./build-councilor-statement-rows";

describe("buildCouncilorStatementRows", () => {
  it("links known councilors and keeps unknown councilor names", () => {
    const result = buildCouncilorStatementRows({
      billId: "bill-1",
      now: "2026-07-08T12:00:00.000Z",
      councilorIdByName: new Map([["福田たえ美", "councilor-1"]]),
      statements: [
        {
          statementIndex: 0,
          rawHeading: "福田たえ美議員",
          councilorName: "福田たえ美",
          partyOrGroup: null,
          contentMd: "発言内容A",
          contentText: "発言内容A",
          sourceSectionTitle: "議員の意見",
        },
        {
          statementIndex: 1,
          rawHeading: "山田太郎議員",
          councilorName: "山田太郎",
          partyOrGroup: "会派",
          contentMd: "発言内容B",
          contentText: "発言内容B",
          sourceSectionTitle: "議員の意見",
        },
      ],
    });

    expect(result.rows).toEqual([
      {
        bill_id: "bill-1",
        difficulty_level: "normal",
        statement_index: 0,
        councilor_id: "councilor-1",
        councilor_name: "福田たえ美",
        raw_heading: "福田たえ美議員",
        party_or_group: null,
        content_md: "発言内容A",
        content_text: "発言内容A",
        updated_at: "2026-07-08T12:00:00.000Z",
      },
      {
        bill_id: "bill-1",
        difficulty_level: "normal",
        statement_index: 1,
        councilor_id: null,
        councilor_name: "山田太郎",
        raw_heading: "山田太郎議員",
        party_or_group: "会派",
        content_md: "発言内容B",
        content_text: "発言内容B",
        updated_at: "2026-07-08T12:00:00.000Z",
      },
    ]);
    expect(result.unknownCouncilorNames).toEqual(["山田太郎"]);
  });

  it("deduplicates unknown councilor warnings", () => {
    const result = buildCouncilorStatementRows({
      billId: "bill-1",
      now: "2026-07-08T12:00:00.000Z",
      councilorIdByName: new Map(),
      statements: [
        {
          statementIndex: 0,
          rawHeading: "山田太郎議員",
          councilorName: "山田太郎",
          partyOrGroup: null,
          contentMd: "発言内容A",
          contentText: "発言内容A",
          sourceSectionTitle: "議員の意見",
        },
        {
          statementIndex: 1,
          rawHeading: "山田太郎議員",
          councilorName: "山田太郎",
          partyOrGroup: null,
          contentMd: "発言内容B",
          contentText: "発言内容B",
          sourceSectionTitle: "議員の意見",
        },
      ],
    });

    expect(result.unknownCouncilorNames).toEqual(["山田太郎"]);
  });

  it("links known faction headings without warnings", () => {
    const result = buildCouncilorStatementRows({
      billId: "bill-1",
      now: "2026-07-08T12:00:00.000Z",
      councilorIdByName: new Map([["公明党世田谷区議団", "faction-1"]]),
      statements: [
        {
          statementIndex: 0,
          rawHeading: "公明党世田谷区議団",
          councilorName: "公明党世田谷区議団",
          partyOrGroup: null,
          contentMd: "会派としての意見本文。",
          contentText: "会派としての意見本文。",
          sourceSectionTitle: "議員の意見",
        },
      ],
    });

    expect(result.rows[0]).toMatchObject({
      councilor_id: "faction-1",
      councilor_name: "公明党世田谷区議団",
      raw_heading: "公明党世田谷区議団",
    });
    expect(result.unknownCouncilorNames).toEqual([]);
  });
});
