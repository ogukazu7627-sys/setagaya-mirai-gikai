import { describe, expect, it, vi } from "vitest";
import {
  COUNCIL_AI_SEARCH_INSTALLATION_ID_KEY,
  getCouncilAiSearchInstallationId,
} from "./council-ai-search-storage";

const installationId =
  "11111111-1111-4111-8111-111111111111" as `${string}-${string}-${string}-${string}-${string}`;

describe("getCouncilAiSearchInstallationId", () => {
  it("匿名UUIDだけを保存して再利用する", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const cryptoApi = {
      getRandomValues: vi.fn(),
      randomUUID: () => installationId,
    };

    expect(getCouncilAiSearchInstallationId(storage, cryptoApi)).toBe(
      installationId
    );
    expect(values).toEqual(
      new Map([[COUNCIL_AI_SEARCH_INSTALLATION_ID_KEY, installationId]])
    );
    expect(getCouncilAiSearchInstallationId(storage, cryptoApi)).toBe(
      installationId
    );
  });

  it("localStorageが使えなくても一時UUIDを返す", () => {
    expect(
      getCouncilAiSearchInstallationId(null, {
        getRandomValues: vi.fn(),
        randomUUID: () => installationId,
      })
    ).toBe(installationId);
  });
});
