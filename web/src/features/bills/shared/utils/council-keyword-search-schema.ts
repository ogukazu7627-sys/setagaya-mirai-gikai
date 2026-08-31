import { z } from "zod";
import { RECOMMENDATION_CATEGORIES } from "@/features/recommendations/shared/constants/recommendation-taxonomy";

const councilSearchThemeIds = [
  "",
  ...RECOMMENDATION_CATEGORIES.map((category) => category.id),
] as const;

export const councilKeywordSearchRequestSchema = z.strictObject({
  installationId: z.uuid(),
  query: z.string().trim().min(1).max(200),
  contentType: z.enum(["all", "bill", "report", "petition", "question"]),
  themeId: z.enum(councilSearchThemeIds),
  committeeName: z.string().trim().max(120),
});
