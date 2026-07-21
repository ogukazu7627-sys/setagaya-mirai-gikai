import { describe, expect, it } from "vitest";
import { extractCouncilorStatementsFromMarkdown } from "./extract-councilor-statements";

describe("extractCouncilorStatementsFromMarkdown", () => {
  it("extracts councilor statements from the councilor opinion section", () => {
    const statements = extractCouncilorStatementsFromMarkdown(`# 主な論点

## 費用をどう見るか

本文。

# 議員、会派の意見

## 福田たえ美議員（公明党世田谷区議団）

子育て支援について質問しました。

- 保育枠
- 相談体制

## 山田太郎議員

防災体制について確認しました。

# よくある質問

## Q. これは議案ですか？

A. いいえ。`);

    expect(statements).toEqual([
      {
        statementIndex: 0,
        rawHeading: "福田たえ美議員(公明党世田谷区議団)",
        councilorName: "福田たえ美",
        partyOrGroup: "公明党世田谷区議団",
        contentMd: "子育て支援について質問しました。\n\n- 保育枠\n- 相談体制",
        contentText: "子育て支援について質問しました。 保育枠 相談体制",
        sourceSectionTitle: "議員、会派の意見",
      },
      {
        statementIndex: 1,
        rawHeading: "山田太郎議員",
        councilorName: "山田太郎",
        partyOrGroup: null,
        contentMd: "防災体制について確認しました。",
        contentText: "防災体制について確認しました。",
        sourceSectionTitle: "議員、会派の意見",
      },
    ]);
  });

  it("matches suffixes, parties, spaces, and unicode variants", () => {
    const statements =
      extractCouncilorStatementsFromMarkdown(`# 議員、会派の意見

## 石原せいじ 議員（会派）

発言内容。`);

    expect(statements[0]?.councilorName).toBe("石原せいじ");
    expect(statements[0]?.partyOrGroup).toBe("会派");
  });

  it("keeps faction headings as statement actors", () => {
    const statements =
      extractCouncilorStatementsFromMarkdown(`# 議員、会派の意見

## 公明党世田谷区議団

会派としての意見本文。`);

    expect(statements[0]).toMatchObject({
      rawHeading: "公明党世田谷区議団",
      councilorName: "公明党世田谷区議団",
      partyOrGroup: null,
      contentMd: "会派としての意見本文。",
      contentText: "会派としての意見本文。",
    });
  });

  it("ignores h2 headings outside the councilor opinion section", () => {
    const statements = extractCouncilorStatementsFromMarkdown(`# 主な論点

## 福田たえ美議員

ここは議員の意見ではありません。`);

    expect(statements).toEqual([]);
  });

  it("stops content before the next h2 or h1 heading", () => {
    const statements =
      extractCouncilorStatementsFromMarkdown(`# 議員、会派の意見

## 福田たえ美議員

最初の発言。

### 補足

補足本文。

## 山田太郎議員

次の発言。

# よくある質問

## Q. 見出し

本文。`);

    expect(statements[0]?.contentMd).toBe(
      "最初の発言。\n\n### 補足\n\n補足本文。"
    );
    expect(statements[1]?.contentMd).toBe("次の発言。");
  });

  it("skips empty councilor headings", () => {
    const statements =
      extractCouncilorStatementsFromMarkdown(`# 議員、会派の意見

## 福田たえ美議員

## 山田太郎議員

発言内容。`);

    expect(statements).toHaveLength(1);
    expect(statements[0]?.councilorName).toBe("山田太郎");
    expect(statements[0]?.statementIndex).toBe(0);
  });

  it("accepts the legacy councilor opinion section heading", () => {
    const statements = extractCouncilorStatementsFromMarkdown(`# 議員の意見

## 福田たえ美議員

発言内容。`);

    expect(statements).toMatchObject([
      {
        councilorName: "福田たえ美",
        sourceSectionTitle: "議員、会派の意見",
      },
    ]);
  });
});
