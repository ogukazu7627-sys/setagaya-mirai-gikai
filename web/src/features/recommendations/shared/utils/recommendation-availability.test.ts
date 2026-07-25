import { describe, expect, it } from "vitest";
import { buildRecommendationAvailability } from "./recommendation-availability";

describe("buildRecommendationAvailability", () => {
  it("counts each bill once per canonical tag and keeps zero-count tags", () => {
    const availability = buildRecommendationAvailability([
      { id: "a", tags: ["不登校支援", "不登校支援"] },
      { id: "b", tags: ["不登校支援", "防災情報"] },
    ]);

    expect(availability["不登校支援"]).toBe(2);
    expect(availability["防災情報"]).toBe(1);
    expect(availability["学校改築"]).toBe(0);
  });
});
