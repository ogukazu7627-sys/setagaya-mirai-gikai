import type { Element, Root } from "hast";
import type { Plugin } from "unified";

export interface InjectConfig {
  /**
   * 挿入対象となるH2のインデックス（1-indexed）
   * 正の値: 前から数える（例: 3 = 3番目のH2の前）
   * 負の値: 後ろから数える（例: -1 = 最後のH2の前）
   */
  targetH2Index?: number;
  /** 挿入対象となる見出しテキスト。H1/H2などトップレベル見出し名で指定する。 */
  targetHeadingText?: string;
  /** targetHeadingText の対象にする見出しタグ。未指定時は h1/h2。 */
  headingTagNames?: string[];
  /** 挿入するカスタムタグ名 */
  tagName: string;
  /** タグに渡すprops */
  props?: Record<string, string | number | boolean | undefined>;
}

export interface RehypeInjectElementOptions {
  /** 挿入する要素の配列 */
  injections: InjectConfig[];
}

/**
 * 指定したn番目のH2要素の直前にカスタム要素を挿入するrehypeプラグイン
 * targetH2Indexが負の値の場合は、後ろから数える
 */
export const rehypeInjectElement: Plugin<[RehypeInjectElementOptions], Root> = (
  options
) => {
  const { injections } = options;

  return (tree: Root) => {
    const headingText = (element: Element): string =>
      element.children
        .map((child) => ("value" in child ? String(child.value) : ""))
        .join("")
        .trim();

    const shouldInjectBeforeHeading = (
      child: Element,
      config: InjectConfig
    ): boolean => {
      if (!config.targetHeadingText) return false;
      const headingTagNames = config.headingTagNames ?? ["h1", "h2"];
      return (
        headingTagNames.includes(child.tagName) &&
        headingText(child) === config.targetHeadingText
      );
    };

    const headingTextInjections = injections.filter(
      (config) => config.targetHeadingText
    );

    // H2の総数を数える
    const totalH2Count = tree.children.filter(
      (child) => child.type === "element" && child.tagName === "h2"
    ).length;

    // H2指定も見出し名指定もない場合は何もしない
    if (totalH2Count === 0 && headingTextInjections.length === 0) {
      return;
    }

    // 各挿入設定を正規化（負のインデックスを正のインデックスに変換）
    const normalizedInjections = injections
      .filter((config) => config.targetH2Index != null)
      .map((config) => {
        let actualIndex = config.targetH2Index ?? 0;
        if (actualIndex < 0) {
          // 後ろから数えたインデックスを前から数えたインデックスに変換
          actualIndex = totalH2Count + actualIndex + 1;
        }

        // 有効範囲外の場合はnullを返す
        if (actualIndex < 1 || actualIndex > totalH2Count) {
          return null;
        }

        return {
          actualIndex,
          tagName: config.tagName,
          props: config.props || {},
        };
      })
      .filter((config) => config !== null);

    // インデックスでソート（小さい順）して、挿入位置がずれないようにする
    normalizedInjections.sort((a, b) => a.actualIndex - b.actualIndex);

    // 挿入処理
    let h2Count = 0;
    const newChildren = [];
    for (const child of tree.children) {
      if (child.type === "element") {
        for (const config of headingTextInjections) {
          if (shouldInjectBeforeHeading(child, config)) {
            const injectedElement: Element = {
              type: "element",
              tagName: config.tagName,
              properties: config.props || {},
              children: [],
            };
            newChildren.push(injectedElement);
          }
        }
      }

      if (child.type === "element" && child.tagName === "h2") {
        h2Count++;

        // このH2の前に挿入する要素があるかチェック
        for (const config of normalizedInjections) {
          if (config.actualIndex === h2Count) {
            const injectedElement: Element = {
              type: "element",
              tagName: config.tagName,
              properties: config.props,
              children: [],
            };
            newChildren.push(injectedElement);
          }
        }
      }

      newChildren.push(child);
    }

    tree.children = newChildren;
  };
};
