import { z } from "zod";
import { normalizeCommitteeText } from "@/features/committees/shared/committee-matching";

const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    );
  }, "存在しない日付です");

const dietSessionFieldsSchema = z.object({
  name: z.string().trim().min(1, "会期名は必須です"),
  start_date: dateInputSchema,
  end_date: dateInputSchema,
  slug: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
});

function refineDietSessionDateRange(
  value: { start_date: string; end_date: string },
  ctx: z.RefinementCtx
) {
  if (value.end_date < value.start_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end_date"],
      message: "会期の終了日は開始日以降にしてください",
    });
  }
}

/** 管理画面の会期フォーム用。既存の会期を更新するときは id を持つ。 */
export const dietSessionFormSchema = dietSessionFieldsSchema
  .extend({ id: z.string().uuid().optional() })
  .superRefine(refineDietSessionDateRange);

/** トークン認証の管理API用。is_active などフォームにない項目は受け付けない。 */
export const adminDietSessionCreateApiSchema = dietSessionFieldsSchema
  .strict()
  .superRefine(refineDietSessionDateRange);

/**
 * 空白・全角半角の違いだけの同名の会期を探す。
 * 既存の会期名には半角スペースと全角スペース、全角数字と半角数字が混在している。
 */
export function findDietSessionByComparableName<T extends { name: string }>(
  sessions: readonly T[],
  name: string
): T | undefined {
  const key = normalizeCommitteeText(name);
  return sessions.find(
    (session) => normalizeCommitteeText(session.name) === key
  );
}
