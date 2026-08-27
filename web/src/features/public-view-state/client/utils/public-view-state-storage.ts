import type { PrimaryNavigationItemId } from "@/features/primary-navigation/shared/primary-navigation";

const STORAGE_PREFIX = "mirai-public-view-state:v1";
const SCROLL_POSITION_PREFIX = `${STORAGE_PREFIX}:scroll`;
const PRIMARY_DESTINATION_PREFIX = `${STORAGE_PREFIX}:primary-destination`;
const COMPONENT_STATE_PREFIX = `${STORAGE_PREFIX}:component`;

export const PUBLIC_VIEW_STATE_UPDATED_EVENT =
  "mirai:public-view-state-updated";

const EXCLUDED_PUBLIC_PATHS = [
  "/admin",
  "/auth",
  "/dev",
  "/preview",
  "/report-problem",
] as const;

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function storageKey(prefix: string, key: string): string {
  return `${prefix}:${encodeURIComponent(key)}`;
}

function readStorageValue(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function normalizeRelativeUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl, "https://civictech-setagaya.org");
    if (parsed.origin !== "https://civictech-setagaya.org") {
      return null;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function buildPublicViewUrl(
  pathname: string,
  searchParams: string
): string {
  const normalizedSearch = searchParams.replace(/^\?/, "");
  return normalizedSearch ? `${pathname}?${normalizedSearch}` : pathname;
}

export function isRestorablePublicPath(pathname: string): boolean {
  if (
    EXCLUDED_PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
  ) {
    return false;
  }

  return !(
    /^\/bills\/[^/]+\/interview(?:\/|$)/.test(pathname) ||
    /^\/report\/[^/]+\/complete(?:\/|$)/.test(pathname)
  );
}

export function readScrollPosition(pageUrl: string): number | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const rawValue = readStorageValue(
    storage,
    storageKey(SCROLL_POSITION_PREFIX, pageUrl)
  );
  if (rawValue === null) {
    return null;
  }

  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function writeScrollPosition(pageUrl: string, scrollY: number): void {
  const storage = getSessionStorage();
  if (!storage || !Number.isFinite(scrollY)) {
    return;
  }

  try {
    storage.setItem(
      storageKey(SCROLL_POSITION_PREFIX, pageUrl),
      String(Math.max(0, Math.round(scrollY)))
    );
  } catch {
    // sessionStorageが使えない環境でも閲覧自体は継続する。
  }
}

export function readPrimaryDestination(
  itemId: PrimaryNavigationItemId,
  baseHref: string
): string {
  const storage = getSessionStorage();
  if (!storage) {
    return baseHref;
  }

  const storedUrl = readStorageValue(
    storage,
    storageKey(PRIMARY_DESTINATION_PREFIX, itemId)
  );
  if (!storedUrl) {
    return baseHref;
  }

  const normalizedUrl = normalizeRelativeUrl(storedUrl);
  if (!normalizedUrl) {
    return baseHref;
  }

  const parsed = new URL(normalizedUrl, "https://civictech-setagaya.org");
  return parsed.pathname === baseHref ? normalizedUrl : baseHref;
}

export function writePrimaryDestination(
  itemId: PrimaryNavigationItemId,
  baseHref: string,
  pageUrl: string
): void {
  const storage = getSessionStorage();
  const normalizedUrl = normalizeRelativeUrl(pageUrl);
  if (!(storage && normalizedUrl)) {
    return;
  }

  const parsed = new URL(normalizedUrl, "https://civictech-setagaya.org");
  if (parsed.pathname !== baseHref) {
    return;
  }

  try {
    storage.setItem(
      storageKey(PRIMARY_DESTINATION_PREFIX, itemId),
      normalizedUrl
    );
    window.dispatchEvent(
      new CustomEvent(PUBLIC_VIEW_STATE_UPDATED_EVENT, {
        detail: { itemId, url: normalizedUrl },
      })
    );
  } catch {
    // 保存に失敗しても通常の主要ナビゲーションを使えるようにする。
  }
}

export function readComponentState<T>(
  key: string,
  validate: (value: unknown) => value is T
): T | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    const rawValue = readStorageValue(
      storage,
      storageKey(COMPONENT_STATE_PREFIX, key)
    );
    if (!rawValue) {
      return null;
    }
    const parsed: unknown = JSON.parse(rawValue);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeComponentState(key: string, value: unknown): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      storageKey(COMPONENT_STATE_PREFIX, key),
      JSON.stringify(value)
    );
  } catch {
    // 容量制限やプライベートブラウズでも閲覧を妨げない。
  }
}
