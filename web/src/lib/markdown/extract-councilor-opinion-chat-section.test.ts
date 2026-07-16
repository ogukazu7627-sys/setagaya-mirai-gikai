import { describe, expect, it } from "vitest";
import {
  extractCouncilorOpinionChatSection,
  splitMarkdownByCouncilorOpinionChatSection,
} from "./extract-councilor-opinion-chat-section";

describe("extractCouncilorOpinionChatSection", () => {
  it("extracts one speaker group as continuous chat messages", () => {
    const section = extractCouncilorOpinionChatSection(`# 議員、会派の意見

## 中里光夫議員

### 中里光夫議員
行政の成果指標は企業の利益目標とは違うものです。
どう考えればいいのでしょうか。

### 市民活動推進課長・伊藤
課題として受け止め、今後の計画に反映します。

### 中里光夫・委員
区民ニーズに対して体制が合っていなかった可能性もあります。

### 市民活動推進課長・伊藤
原因や理由を検証しながら改善に努めます。`);

    expect(section?.groups).toHaveLength(1);
    expect(section?.groups[0]).toMatchObject({
      groupIndex: 0,
      rawHeading: "中里光夫議員",
      councilorName: "中里光夫",
      iconUrl: "/icons/councilors/nakazato-mitsuo.jpg",
    });
    expect(section?.groups[0]?.messages).toMatchObject([
      {
        messageIndex: 0,
        rawSpeaker: "中里光夫議員",
        speakerName: "中里光夫",
        side: "questioner",
      },
      {
        messageIndex: 1,
        rawSpeaker: "市民活動推進課長・伊藤",
        speakerName: "市民活動推進課長・伊藤",
        side: "answerer",
      },
      {
        messageIndex: 2,
        rawSpeaker: "中里光夫・委員",
        speakerName: "中里光夫・委員",
        side: "questioner",
      },
      {
        messageIndex: 3,
        rawSpeaker: "市民活動推進課長・伊藤",
        speakerName: "市民活動推進課長・伊藤",
        side: "answerer",
      },
    ]);
  });

  it("extracts multiple speaker groups and ignores thematic breaks", () => {
    const section = extractCouncilorOpinionChatSection(`# 議員、会派の意見

## 中里光夫議員

### 中里光夫議員
質問です。

### 課長
答弁です。

---

## 田中優子議員

### 田中優子・委員
質問です。

### 部長
答弁です。`);

    expect(section?.groups.map((group) => group.rawHeading)).toEqual([
      "中里光夫議員",
      "田中優子議員",
    ]);
    expect(section?.groups[0]?.messages[1]?.bodyText).toBe("答弁です。");
    expect(section?.groups[1]?.messages[0]?.side).toBe("questioner");
  });

  it("returns null for the old plain statement format", () => {
    expect(
      extractCouncilorOpinionChatSection(`# 議員、会派の意見

## 中里光夫議員

通常の発言要約です。`)
    ).toBeNull();
  });

  it("returns null for the old question-title chat format", () => {
    expect(
      extractCouncilorOpinionChatSection(`# 議員、会派の意見

## 中里光夫議員

### 成果指標の数字は、どう考えればいいのか？

#### 中里光夫議員
質問です。

#### 課長
答弁です。`)
    ).toBeNull();
  });

  it("ignores empty speaker headings", () => {
    const section = extractCouncilorOpinionChatSection(`# 議員、会派の意見

## 中里光夫議員

### 中里光夫議員

### 課長
答弁です。`);

    expect(section?.groups[0]?.messages).toHaveLength(1);
    expect(section?.groups[0]?.messages[0]?.rawSpeaker).toBe("課長");
  });
});

describe("splitMarkdownByCouncilorOpinionChatSection", () => {
  it("splits the chat section from surrounding markdown", () => {
    const split = splitMarkdownByCouncilorOpinionChatSection(`# 具体的な内容

本文です。

# 議員、会派の意見

## 中里光夫議員

### 中里光夫議員
質問です。

### 課長
答弁です。

# よくある質問

FAQです。`);

    expect(split?.beforeMarkdown).toBe("# 具体的な内容\n\n本文です。");
    expect(split?.chatSection.groups).toHaveLength(1);
    expect(split?.afterMarkdown).toBe("# よくある質問\n\nFAQです。");
  });
});
