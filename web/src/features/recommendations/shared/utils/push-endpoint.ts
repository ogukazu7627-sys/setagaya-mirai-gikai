const EXACT_PUSH_SERVICE_HOSTS = new Set([
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
]);

export function isAllowedWebPushEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== ""
  ) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  return (
    EXACT_PUSH_SERVICE_HOSTS.has(hostname) ||
    hostname === "notify.windows.com" ||
    hostname.endsWith(".notify.windows.com")
  );
}
