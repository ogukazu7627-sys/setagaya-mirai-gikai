import { createAnonymousInstallationId } from "@/features/recommendations/client/utils/recommendation-storage";

export const BUDGET_SEARCH_INSTALLATION_ID_KEY =
  "mirai-gikai:budget-search-installation-id:v1";

export function getBrowserBudgetSearchInstallationId(): string {
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  return getBudgetSearchInstallationId(storage, window.crypto);
}

export function getBudgetSearchInstallationId(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  cryptoApi: Pick<Crypto, "getRandomValues"> & {
    randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
  }
): string {
  if (storage) {
    try {
      const stored = storage.getItem(BUDGET_SEARCH_INSTALLATION_ID_KEY);
      if (stored && isUuid(stored)) {
        return stored;
      }
    } catch {
      // An ephemeral ID still lets the current request proceed.
    }
  }

  const installationId = createAnonymousInstallationId(cryptoApi);
  if (storage) {
    try {
      storage.setItem(BUDGET_SEARCH_INSTALLATION_ID_KEY, installationId);
    } catch {
      // Private browsing can make storage writes unavailable.
    }
  }
  return installationId;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
