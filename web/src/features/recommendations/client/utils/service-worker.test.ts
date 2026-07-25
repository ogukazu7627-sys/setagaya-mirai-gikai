import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type WorkerHarness = ReturnType<typeof createWorkerHarness>;

function createWorkerHarness() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const focus = vi.fn().mockResolvedValue(undefined);
  const navigate = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const client = {
    url: "https://example.test/bills/1",
    focus,
    navigate,
  };
  const self = {
    location: { origin: "https://example.test" },
    registration: { showNotification },
    clients: {
      matchAll: vi.fn().mockResolvedValue([client]),
      openWindow,
    },
    addEventListener: (
      type: string,
      listener: (event: Record<string, unknown>) => void
    ) => listeners.set(type, listener),
  };
  const code = readFileSync(
    new URL("../../../../../public/sw.js", import.meta.url),
    "utf8"
  );
  runInNewContext(code, { self, URL });
  return {
    listeners,
    showNotification,
    focus,
    navigate,
    openWindow,
    setClients: (clients: unknown[]) =>
      self.clients.matchAll.mockResolvedValueOnce(clients),
  };
}

async function dispatchPush(
  harness: WorkerHarness,
  payload: unknown
): Promise<void> {
  let task: Promise<unknown> | undefined;
  harness.listeners.get("push")?.({
    data: { json: () => payload },
    waitUntil: (promise: Promise<unknown>) => {
      task = promise;
    },
  });
  await task;
}

describe("recommendation service worker", () => {
  it("shows a tagged notification for a valid payload", async () => {
    const harness = createWorkerHarness();
    await dispatchPush(harness, {
      title: "今日のあなたへのおすすめ",
      body: "「学校の暑さ対策」ほか4件",
      date: "2026-07-25",
    });

    expect(harness.showNotification).toHaveBeenCalledWith(
      "今日のあなたへのおすすめ",
      expect.objectContaining({
        tag: "daily-recommendations-2026-07-25",
      })
    );
  });

  it("ignores malformed or arbitrary-title payloads", async () => {
    const harness = createWorkerHarness();
    await dispatchPush(harness, {
      title: "任意の通知",
      body: "body",
      date: "2026-07-25",
    });
    expect(harness.showNotification).not.toHaveBeenCalled();
  });

  it("navigates and focuses an existing same-origin tab", async () => {
    const harness = createWorkerHarness();
    let task: Promise<unknown> | undefined;
    harness.listeners.get("notificationclick")?.({
      notification: { close: vi.fn() },
      waitUntil: (promise: Promise<unknown>) => {
        task = promise;
      },
    });
    await task;
    expect(harness.navigate).toHaveBeenCalledWith("/#today-recommendations");
    expect(harness.focus).toHaveBeenCalled();
    expect(harness.openWindow).not.toHaveBeenCalled();
  });

  it("opens the fixed recommendation URL when no tab exists", async () => {
    const harness = createWorkerHarness();
    harness.setClients([]);
    let task: Promise<unknown> | undefined;
    harness.listeners.get("notificationclick")?.({
      notification: { close: vi.fn() },
      waitUntil: (promise: Promise<unknown>) => {
        task = promise;
      },
    });
    await task;
    expect(harness.openWindow).toHaveBeenCalledWith("/#today-recommendations");
  });
});
