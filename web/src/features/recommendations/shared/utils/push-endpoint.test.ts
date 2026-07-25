import { describe, expect, it } from "vitest";
import { isAllowedWebPushEndpoint } from "./push-endpoint";

describe("isAllowedWebPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/example",
    "https://updates.push.services.mozilla.com/wpush/v2/example",
    "https://web.push.apple.com/QN/example",
    "https://wns2-by3p.notify.windows.com/w/?token=example",
  ])("allows a known browser push service: %s", (endpoint) => {
    expect(isAllowedWebPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    "https://example.com/push",
    "https://fcm.googleapis.com.evil.example/push",
    "https://user@example.com/push",
    "https://fcm.googleapis.com:8443/push",
    "http://fcm.googleapis.com/push",
  ])("rejects an arbitrary or malformed endpoint: %s", (endpoint) => {
    expect(isAllowedWebPushEndpoint(endpoint)).toBe(false);
  });
});
