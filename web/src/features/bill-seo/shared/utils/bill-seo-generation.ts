import { z } from "zod";
import { BILL_SEO_SITE_NAME } from "@/features/bills/shared/utils/bill-seo-metadata";
import type { BillSeoGeneratedFields, BillSeoSourceData } from "../types";

export const BILL_SEO_GENERATION_LIMITS = {
  storedTitleMax: 47,
  descriptionMin: 50,
  descriptionMax: 160,
  keywordMin: 3,
  keywordMax: 8,
} as const;

export const billSeoGenerationSchema = z.object({
  seoTitle: z.string(),
  seoDescription: z.string(),
  seoKeywords: z.array(z.string()),
});

export function normalizeGeneratedBillSeo(
  value: z.infer<typeof billSeoGenerationSchema>
): BillSeoGeneratedFields {
  const titleSuffix = `| ${BILL_SEO_SITE_NAME}`;
  const title = normalizeWhitespace(value.seoTitle)
    .replace(new RegExp(`\\s*\\|\\s*${escapeRegExp(BILL_SEO_SITE_NAME)}$`), "")
    .trim();
  const keywords = Array.from(
    new Set(
      value.seoKeywords
        .map(normalizeWhitespace)
        .map((keyword) => keyword.replace(/^#+/, "").trim())
        .filter(Boolean)
    )
  );

  return {
    seoTitle: title.endsWith(titleSuffix)
      ? title.slice(0, -titleSuffix.length).trim()
      : title,
    seoDescription: normalizeWhitespace(value.seoDescription),
    seoKeywords: keywords,
  };
}

export function validateGeneratedBillSeo(
  value: BillSeoGeneratedFields
): string[] {
  const issues: string[] = [];
  const titleLength = Array.from(value.seoTitle).length;
  const descriptionLength = Array.from(value.seoDescription).length;

  if (!value.seoTitle) {
    issues.push(
      "SEOタイトルが空です。運営サイト名を除いた案件固有の題名を作ってください。"
    );
  } else if (titleLength > BILL_SEO_GENERATION_LIMITS.storedTitleMax) {
    issues.push(
      `SEOタイトルは${BILL_SEO_GENERATION_LIMITS.storedTitleMax}文字以内にしてください（現在${titleLength}文字）。`
    );
  }

  if (descriptionLength < BILL_SEO_GENERATION_LIMITS.descriptionMin) {
    issues.push(
      `SEO説明文は${BILL_SEO_GENERATION_LIMITS.descriptionMin}文字以上にしてください（現在${descriptionLength}文字）。`
    );
  }
  if (descriptionLength > BILL_SEO_GENERATION_LIMITS.descriptionMax) {
    issues.push(
      `SEO説明文は${BILL_SEO_GENERATION_LIMITS.descriptionMax}文字以内にしてください（現在${descriptionLength}文字）。`
    );
  }

  if (
    value.seoKeywords.length < BILL_SEO_GENERATION_LIMITS.keywordMin ||
    value.seoKeywords.length > BILL_SEO_GENERATION_LIMITS.keywordMax
  ) {
    issues.push(
      `SEOキーワードは${BILL_SEO_GENERATION_LIMITS.keywordMin}〜${BILL_SEO_GENERATION_LIMITS.keywordMax}件にしてください。`
    );
  }

  if (value.seoKeywords.some((keyword) => Array.from(keyword).length > 30)) {
    issues.push("SEOキーワードは1件30文字以内にしてください。");
  }

  return issues;
}

export function buildBillSeoGenerationPrompt(
  source: BillSeoSourceData,
  repairIssues: string[] = []
): string {
  const sourceLinks = source.sources
    .map((item) =>
      [item.title, item.url ? `(${item.url})` : ""].filter(Boolean).join(" ")
    )
    .join("\n");
  const repair =
    repairIssues.length > 0
      ? `\n前回出力には次の問題がありました。すべて直してください。\n- ${repairIssues.join("\n- ")}\n`
      : "";

  return `あなたは世田谷区議会の公開情報を扱うSEO編集者です。
以下の公開ページ情報だけを根拠に、検索結果で内容が正確に伝わる日本語のSEO情報を作成してください。
推測、誇張、扇情的な表現、本文にない固有名詞や数値を加えないでください。

出力要件:
- seoTitle: 「 | ${BILL_SEO_SITE_NAME}」を付けず、案件固有の題名だけ。47文字以内。
- seoDescription: 50〜160文字。できれば80〜140文字。案件の内容、論点、世田谷区との関係が分かる文章。
- seoKeywords: 3〜8件。検索意図と内部検索に役立つ具体語。重複や記号だけの語を避ける。
${repair}
公開ページ情報:
正式名称: ${source.formalName}
表示タイトル: ${source.normalTitle}
概要: ${source.normalSummary}
情報種別: ${source.itemType}
大分類: ${source.majorCategory ?? "未設定"}
日付: ${source.submittedDate ?? "未設定"}
状態: ${source.statusLabel ?? "未設定"}
状態説明: ${source.statusNote ?? "未設定"}
会期: ${source.dietSessionName ?? "未設定"}
タグ: ${source.tags.join("、") || "なし"}
公式資料・出典:
${sourceLinks || "なし"}

本文（normal版Markdown）:
${source.normalContent}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
