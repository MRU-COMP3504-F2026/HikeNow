import { describe, expect, it } from "vitest";
import { getAverageReviewRating } from "./review-summary";

describe("review summary", () => {
  it("averages ratings from only the provided reviews", () => {
    expect(
      getAverageReviewRating([
        { rating: "5" },
        { rating: "4" },
        { rating: "3" },
        { rating: 5 },
        { rating: 4 },
      ]),
    ).toBe(4.2);
  });

  it("ignores missing and out-of-range ratings", () => {
    expect(
      getAverageReviewRating([
        { rating: null },
        { rating: "0" },
        { rating: "6" },
        { rating: "bad" },
        { rating: "4" },
      ]),
    ).toBe(4);
  });

  it("returns null when no valid ratings are present", () => {
    expect(getAverageReviewRating([])).toBeNull();
    expect(getAverageReviewRating([{ rating: null }])).toBeNull();
  });
});
