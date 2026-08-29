import { describe, expect, it } from "vitest";
import {
  buildCouncilorProfileQuestionSources,
  type CouncilorProfileStatementInput,
} from "./build-councilor-profile-question-sources";

const NORMAL_CONTENT = `# 議員、会派の意見

## 甲議員

### 甲議員

最初の質問です。

### 保育課長

区側の答弁です。

### 甲議員

二つ目の質問です。
`;

function createStatement(
  overrides: Partial<CouncilorProfileStatementInput> = {}
): CouncilorProfileStatementInput {
  return {
    billId: "bill-1",
    billTitle: "保育施策について",
    councilorName: "甲",
    difficultyLevel: "normal",
    majorCategory: "子育て👶",
    normalContent: NORMAL_CONTENT,
    publicationCategory: "report",
    publishStatus: "published",
    statementIndex: 0,
    ...overrides,
  };
}

describe("buildCouncilorProfileQuestionSources", () => {
  it("includes only the councilor's questioner messages", () => {
    expect(buildCouncilorProfileQuestionSources([createStatement()])).toEqual([
      expect.objectContaining({
        questionText: "最初の質問です。\n\n二つ目の質問です。",
      }),
    ]);
    expect(
      buildCouncilorProfileQuestionSources([createStatement()])[0]?.questionText
    ).not.toContain("区側の答弁");
  });

  it("excludes drafts, hard content, and unsupported categories", () => {
    expect(
      buildCouncilorProfileQuestionSources([
        createStatement({ publishStatus: "draft" }),
        createStatement({ difficultyLevel: "hard" }),
        createStatement({ publicationCategory: "other" }),
      ])
    ).toEqual([]);
  });

  it("excludes a different councilor group at the same index", () => {
    expect(
      buildCouncilorProfileQuestionSources([
        createStatement({ councilorName: "乙" }),
      ])
    ).toEqual([]);
  });
});
