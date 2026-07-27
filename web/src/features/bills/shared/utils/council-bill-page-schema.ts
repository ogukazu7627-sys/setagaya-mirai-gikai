import { z } from "zod";
import { RECOMMENDATION_CATEGORIES } from "@/features/recommendations/shared/constants/recommendation-taxonomy";

const themeIds = RECOMMENDATION_CATEGORIES.map((category) => category.id) as [
  (typeof RECOMMENDATION_CATEGORIES)[number]["id"],
  ...(typeof RECOMMENDATION_CATEGORIES)[number]["id"][],
];
const optionalThemeIds = ["", ...themeIds] as const;
const requestBase = {
  installationId: z.uuid(),
  page: z.number().int().min(1).max(100),
};

export const councilBillPageRequestSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    ...requestBase,
    mode: z.literal("filters"),
    contentType: z.enum(["all", "bill", "report", "petition", "question"]),
    themeId: z.enum(optionalThemeIds),
    committeeName: z.string().trim().max(120),
  }),
  z.strictObject({
    ...requestBase,
    mode: z.literal("theme"),
    year: z.number().int().min(2000).max(2100),
    themeId: z.enum(themeIds),
  }),
]);
