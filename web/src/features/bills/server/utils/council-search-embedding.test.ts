import { describe, expect, it } from "vitest";
import {
  createCouncilSearchContentHash,
  formatPostgresVector,
} from "./council-search-embedding";

describe("createCouncilSearchContentHash", () => {
  it("同じ本文から安定したSHA-256を作る", () => {
    const first = createCouncilSearchContentHash("防災に関する本文");
    const second = createCouncilSearchContentHash("防災に関する本文");

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it("本文が変わるとハッシュも変わる", () => {
    expect(createCouncilSearchContentHash("本文A")).not.toBe(
      createCouncilSearchContentHash("本文B")
    );
  });
});

describe("formatPostgresVector", () => {
  it("512次元の有限値をpgvector文字列へ変換する", () => {
    const vector = formatPostgresVector(Array.from({ length: 512 }, () => 0));

    expect(vector.startsWith("[0,0,0")).toBe(true);
    expect(vector.endsWith("]")).toBe(true);
  });

  it("次元数が異なる値を拒否する", () => {
    expect(() => formatPostgresVector([0, 1])).toThrow(
      "Expected 512 embedding dimensions"
    );
  });
});
