const SITE_TITLE_SUFFIX = "みらい議会＠世田谷区";

export type CouncilorMetadataInput = {
  displayName: string;
  statementCount: number;
};

export type CouncilorMetadataText = {
  title: string;
  description: string;
};

/**
 * 議員詳細ページのタイトルと説明文。
 * 全議員で同じ文言にならないよう、氏名と掲載件数を必ず含める。
 */
export function buildCouncilorMetadata({
  displayName,
  statementCount,
}: CouncilorMetadataInput): CouncilorMetadataText {
  const name = displayName.trim() || "議員";
  return {
    title: `${name} | ${SITE_TITLE_SUFFIX}`,
    description:
      statementCount > 0
        ? `世田谷区議会議員 ${name} の、このサイトに掲載中の発言${statementCount}件を確認できます。`
        : `世田谷区議会議員 ${name} のプロフィールを確認できます。`,
  };
}
