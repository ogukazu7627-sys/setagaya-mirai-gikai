/**
 * チャットの system prompt に渡すナレッジソース文字列を決める。
 * ナレッジソースがあれば常に返し、空ならプロンプト側で省略させる。
 */
export function pickChatKnowledgeSource(
  bill:
    | {
        knowledge_source?: string | null;
      }
    | null
    | undefined
): string {
  return bill?.knowledge_source ?? "";
}
