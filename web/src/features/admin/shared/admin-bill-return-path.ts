const ADMIN_BILLS_PATH = "/admin/bills";
const LOCAL_BASE_URL = "http://admin.local";

export function normalizeAdminBillsReturnPath(value: unknown): string {
  if (typeof value !== "string") {
    return ADMIN_BILLS_PATH;
  }

  const rawPath = value.trim();
  if (!rawPath) {
    return ADMIN_BILLS_PATH;
  }

  try {
    const url = new URL(rawPath, LOCAL_BASE_URL);
    if (url.origin !== LOCAL_BASE_URL || url.pathname !== ADMIN_BILLS_PATH) {
      return ADMIN_BILLS_PATH;
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return ADMIN_BILLS_PATH;
  }
}

export function appendAdminBillsReturnPath(
  href: string,
  returnPath: string
): string {
  const url = new URL(href, LOCAL_BASE_URL);
  url.searchParams.set(
    "return_path",
    normalizeAdminBillsReturnPath(returnPath)
  );

  return `${url.pathname}${url.search}`;
}
