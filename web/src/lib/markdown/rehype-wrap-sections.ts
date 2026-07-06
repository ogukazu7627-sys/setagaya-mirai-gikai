import type { Element, ElementContent, Root } from "hast";

/**
 * 見出しとその後続要素をsectionで囲むrehypeプラグイン。
 * H1が複数ある案件本文ではH1を大区切りにし、H2は論点やFAQ内の小見出しとして扱う。
 */
export function rehypeWrapSections() {
  return (tree: Root) => {
    let currentSection: Element | null = null;

    // 既存の子要素を一時的に保存
    const originalChildren = [...tree.children];
    const h1Count = originalChildren.filter(
      (child) => child.type === "element" && child.tagName === "h1"
    ).length;
    const sectionHeadingTag = h1Count > 1 ? "h1" : "h2";

    tree.children = [];

    for (const child of originalChildren) {
      if (child.type === "element" && child.tagName === sectionHeadingTag) {
        // 既存のsectionを完了
        if (currentSection && currentSection.children.length > 0) {
          tree.children.push(currentSection);
        }

        // h2をそのまま追加
        tree.children.push(child);

        // 新しい空のsectionを開始
        currentSection = {
          type: "element",
          tagName: "section",
          properties: {},
          children: [],
        };
      } else if (currentSection && child.type === "element") {
        // 現在のsectionに追加（element型のみ）
        currentSection.children.push(child as ElementContent);
      } else {
        // h2より前の要素はそのまま追加
        tree.children.push(child);
      }
    }

    // 最後のsectionを追加（中身がある場合のみ）
    if (currentSection && currentSection.children.length > 0) {
      tree.children.push(currentSection);
    }
  };
}
