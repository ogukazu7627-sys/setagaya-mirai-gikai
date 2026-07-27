const DEFAULT_BATCH_DELAY_MS = 750;

type ImpressionContext = {
  installationId: string;
  recommendationDate: string;
  preferenceVersion: number;
};

type PendingBatch = {
  contextKey: string;
  installationId: string;
  billIds: Set<string>;
  sentKeys: string[];
};

export function createRecommendationImpressionBatcher(
  send: (installationId: string, billIds: string[]) => Promise<unknown>,
  delayMs = DEFAULT_BATCH_DELAY_MS
) {
  let pending: PendingBatch | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const sentKeys = new Set<string>();

  const clearTimer = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const flush = async () => {
    clearTimer();
    const batch = pending;
    pending = null;
    if (!batch || batch.billIds.size === 0) {
      return;
    }

    try {
      await send(batch.installationId, Array.from(batch.billIds));
    } catch {
      for (const key of batch.sentKeys) {
        sentKeys.delete(key);
      }
    }
  };

  const record = (context: ImpressionContext, billId: string) => {
    const contextKey = [
      context.installationId,
      context.preferenceVersion,
      context.recommendationDate,
    ].join(":");
    const sentKey = `${contextKey}:${billId}`;
    if (sentKeys.has(sentKey)) {
      return;
    }

    if (pending && pending.contextKey !== contextKey) {
      void flush();
    }
    if (!pending) {
      pending = {
        contextKey,
        installationId: context.installationId,
        billIds: new Set(),
        sentKeys: [],
      };
    }

    sentKeys.add(sentKey);
    pending.billIds.add(billId);
    pending.sentKeys.push(sentKey);
    clearTimer();
    timeoutId = setTimeout(() => void flush(), delayMs);
  };

  const dispose = () => {
    void flush();
  };

  return { dispose, flush, record };
}
