import "server-only";

import { buildDailyPushPayload } from "../../shared/utils/push-notification";
import {
  claimDailyPushSubscriptions,
  findRecommendationBillsByIds,
  insertRecommendationImpressions,
  updatePushNotificationStatus,
} from "../repositories/recommendation-repository";
import { getOrCreateDailyRecommendations } from "./daily-recommendation-service";
import { defaultWebPushSender, type WebPushSender } from "./web-push-sender";

type DailyPushResult = {
  claimed: number;
  sent: number;
  skipped: number;
  expired: number;
  failed: number;
};

export async function sendDailyRecommendationPushes(input: {
  date: string;
  sender?: WebPushSender;
  limit?: number;
}): Promise<DailyPushResult> {
  const sender = input.sender ?? defaultWebPushSender;
  const subscriptions = await claimDailyPushSubscriptions(
    input.date,
    input.limit ?? 500
  );
  const result: DailyPushResult = {
    claimed: subscriptions.length,
    sent: 0,
    skipped: 0,
    expired: 0,
    failed: 0,
  };

  for (const subscription of subscriptions) {
    try {
      const daily = await getOrCreateDailyRecommendations(
        subscription.profile_id,
        input.date
      );
      const firstBillId = daily.bill_ids[0];
      if (!firstBillId) {
        await updatePushNotificationStatus({
          subscriptionId: subscription.subscription_id,
          status: "skipped",
        });
        result.skipped += 1;
        continue;
      }

      const [firstBill] = await findRecommendationBillsByIds(
        [firstBillId],
        "normal"
      );
      if (!firstBill) {
        await updatePushNotificationStatus({
          subscriptionId: subscription.subscription_id,
          status: "skipped",
        });
        result.skipped += 1;
        continue;
      }

      const payload = buildDailyPushPayload(
        firstBill.bill_content?.title ?? firstBill.name,
        daily.bill_ids.length,
        input.date
      );
      await sender.send(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload)
      );
      await insertRecommendationImpressions({
        profileId: subscription.profile_id,
        billIds: [firstBillId],
        source: "push",
      });
      await updatePushNotificationStatus({
        subscriptionId: subscription.subscription_id,
        status: "sent",
      });
      result.sent += 1;
    } catch (error) {
      const statusCode = getWebPushStatusCode(error);
      const expired = statusCode === 404 || statusCode === 410;
      await updatePushNotificationStatus({
        subscriptionId: subscription.subscription_id,
        status: expired ? "expired" : "failed",
        disable: expired,
      });
      if (expired) {
        result.expired += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  return result;
}

function getWebPushStatusCode(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return null;
}
