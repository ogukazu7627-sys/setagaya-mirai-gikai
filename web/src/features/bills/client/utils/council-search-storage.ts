import { createAnonymousInstallationId } from "@/features/recommendations/client/utils/recommendation-storage";

export const COUNCIL_SEARCH_INSTALLATION_ID_KEY =
  "mirai-gikai:council-search-installation-id:v1";

export function getBrowserCouncilSearchInstallationId(): string {
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }
  return getCouncilSearchInstallationId(storage, window.crypto);
}

export function getCouncilSearchInstallationId(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  cryptoApi: Pick<Crypto, "getRandomValues"> & {
    randomUUID?: () => `${string}-${string}-${string}-${string}-${string}`;
  }
): string {
  if (storage) {
    try {
      const stored = storage.getItem(COUNCIL_SEARCH_INSTALLATION_ID_KEY);
      if (stored && isUuid(stored)) {
        return stored;
      }
    } catch {
      // Private browsing can make storage reads unavailable.
    }
  }

  const installationId = createAnonymousInstallationId(cryptoApi);
  if (storage) {
    try {
      storage.setItem(COUNCIL_SEARCH_INSTALLATION_ID_KEY, installationId);
    } catch {
      // The ephemeral ID still allows the current search request to proceed.
    }
  }
  return installationId;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
