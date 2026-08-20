import { z } from "zod";
import {
  getParentCategoryIdsForTags,
  isRecommendationSmallTag,
  MAX_SELECTED_SMALL_TAGS,
  MIN_SELECTED_SMALL_TAGS,
  type RecommendationSmallTag,
} from "../constants/recommendation-taxonomy";
import { isAllowedWebPushEndpoint } from "./push-endpoint";

const installationIdSchema = z.uuid();
const recommendationTagSchema = z.string().refine(isRecommendationSmallTag, {
  message: "許可されていない興味分野です",
});

const selectedSmallTagsSchema = z
  .array(recommendationTagSchema)
  .min(MIN_SELECTED_SMALL_TAGS, {
    message: `興味分野は${MIN_SELECTED_SMALL_TAGS}件以上選んでください`,
  })
  .max(MAX_SELECTED_SMALL_TAGS)
  .refine((tags) => new Set(tags).size === tags.length, {
    message: "興味分野が重複しています",
  })
  .transform((tags) => tags as RecommendationSmallTag[]);

export const preferenceRequestSchema = z
  .object({
    installationId: installationIdSchema,
    selectedSmallTags: selectedSmallTagsSchema,
    timezone: z.string().trim().min(1).max(64),
  })
  .transform((value) => ({
    ...value,
    selectedParentCategoryIds: getParentCategoryIdsForTags(
      value.selectedSmallTags
    ),
  }));

export const installationRequestSchema = z.object({
  installationId: installationIdSchema,
});

export const impressionRequestSchema = z.object({
  installationId: installationIdSchema,
  billIds: z
    .array(z.uuid())
    .min(1)
    .max(5)
    .refine((billIds) => new Set(billIds).size === billIds.length, {
      message: "案件IDが重複しています",
    }),
  source: z.literal("homepage"),
});

const pushEndpointSchema = z.url().max(4096).refine(isAllowedWebPushEndpoint, {
  message: "許可されていないPush endpointです",
});

export const pushSubscriptionRequestSchema = z.object({
  installationId: installationIdSchema,
  subscription: z.object({
    endpoint: pushEndpointSchema,
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(16).max(512),
      auth: z.string().min(8).max(256),
    }),
  }),
});

export const pushUnsubscribeRequestSchema = z.object({
  installationId: installationIdSchema,
  endpoint: pushEndpointSchema.optional(),
});

export type PreferenceRequest = z.infer<typeof preferenceRequestSchema>;
