const X_USERNAME_PATTERN = /^[A-Za-z0-9_]{1,15}$/;
const X_ID_PATTERN = /^[0-9]{1,19}$/;
const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

export function extractXUsername(accountUrl: string): string | null {
  try {
    const url = new URL(accountUrl);
    const username = url.pathname.split("/").filter(Boolean)[0];

    if (
      url.protocol !== "https:" ||
      !X_HOSTS.has(url.hostname.toLowerCase()) ||
      !username ||
      !X_USERNAME_PATTERN.test(username)
    ) {
      return null;
    }

    return username;
  } catch {
    return null;
  }
}

export function buildXPostUrl(username: string, postId: string): string {
  if (!X_USERNAME_PATTERN.test(username) || !isValidXId(postId)) {
    throw new Error("Invalid X username or post ID");
  }

  return `https://x.com/${username}/status/${postId}`;
}

export function isValidXId(value: string): boolean {
  return X_ID_PATTERN.test(value);
}
