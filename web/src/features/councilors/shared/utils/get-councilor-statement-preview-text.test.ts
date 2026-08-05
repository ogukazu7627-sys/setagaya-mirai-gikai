import { describe, expect, it } from "vitest";
import { getCouncilorStatementPreviewText } from "./get-councilor-statement-preview-text";

describe("getCouncilorStatementPreviewText", () => {
  it("returns the first councilor chat message for the target statement", () => {
    const preview = getCouncilorStatementPreviewText({
      statementIndex: 1,
      fallbackText: "フォールバック本文",
      normalContent: `# 議員、会派の意見

## 中里光夫議員

### 中里光夫議員
1人目の質問です。

### 課長
1人目への答弁です。

## 田中優子議員

### 田中優子議員
2人目の最初の質問です。
学校施設の整備方針を確認したいです。

### 部長
2人目への答弁です。`,
    });

    expect(preview).toBe(
      "2人目の最初の質問です。\n学校施設の整備方針を確認したいです。"
    );
  });

  it("falls back to the first message when the speaker side cannot be detected", () => {
    const preview = getCouncilorStatementPreviewText({
      statementIndex: 0,
      fallbackText: "フォールバック本文",
      normalContent: `# 議員、会派の意見

## 質問グループ

### 発言者
最初のメッセージです。`,
    });

    expect(preview).toBe("最初のメッセージです。");
  });

  it("falls back to the synced statement text when no chat group is found", () => {
    const preview = getCouncilorStatementPreviewText({
      statementIndex: 2,
      fallbackText: " 同期済みの本文です。\n\n\n",
      normalContent: `# 議員、会派の意見

## 中里光夫議員

通常の発言要約です。`,
    });

    expect(preview).toBe("同期済みの本文です。");
  });
});
