export type PetitionDocumentOpinion = {
  title?: string | null;
  content?: string | null;
};

export type BuildPetitionDocumentTextParams = {
  billName: string;
  billTitle?: string | null;
  summary?: string | null;
  opinions: PetitionDocumentOpinion[];
};

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeOpinions(opinions: PetitionDocumentOpinion[]) {
  return opinions
    .map((opinion) => ({
      title: cleanText(opinion.title),
      content: cleanText(opinion.content),
    }))
    .filter((opinion) => opinion.title || opinion.content)
    .slice(0, 3);
}

export function buildPetitionDocumentTitle({
  billName,
  billTitle,
}: Pick<BuildPetitionDocumentTextParams, "billName" | "billTitle">) {
  const baseTitle = cleanText(billTitle) || cleanText(billName) || "区議会案件";
  return `${baseTitle}に関する請願下書き`;
}

export function buildPetitionDocumentText({
  billName,
  billTitle,
  summary,
  opinions,
}: BuildPetitionDocumentTextParams) {
  const title = cleanText(billTitle) || cleanText(billName) || "区議会案件";
  const summaryText = cleanText(summary);
  const normalizedOpinions = normalizeOpinions(opinions);
  const petitionItems =
    normalizedOpinions.length > 0
      ? normalizedOpinions
          .map((opinion, index) => {
            const body = opinion.content || opinion.title;
            return `${index + 1}. ${body}`;
          })
          .join("\n")
      : "1. （区議会や区に求める具体的な対応を記入してください）";
  const reasons = [
    summaryText,
    ...normalizedOpinions.map((opinion) =>
      [opinion.title, opinion.content].filter(Boolean).join(": ")
    ),
  ].filter(Boolean);

  return `請願書

世田谷区議会議長 あて

件名
${title}に関する請願

請願の要旨
${summaryText || "（AIインタビューの内容をもとに、お願いしたいことの要旨を記入してください）"}

請願事項
${petitionItems}

請願理由
${reasons.length > 0 ? reasons.join("\n\n") : "（そうお願いしたい理由や、困っていること・不安に思うことを記入してください）"}

提出年月日
令和　年　月　日

請願者
住所：
氏名：
電話番号：

紹介議員
氏名：

備考
この文書は、みらい議会＠世田谷区のAIインタビュー結果をもとに作成した下書きです。提出前に、内容、住所、氏名、電話番号、紹介議員欄を必ず確認してください。紹介議員がいない場合、世田谷区議会では請願ではなく陳情として扱われる可能性があります。
`;
}
