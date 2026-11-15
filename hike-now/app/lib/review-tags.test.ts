import { describe, expect, it } from "vitest";
import { getTopReviewTags } from "./review-tags";

describe("review tag summaries", () => {
  it("keeps all-time tag order while counting only visible reviews", () => {
    const allReviews = [
      ...Array.from({ length: 12 }, () => ({ tags: ["Muddy"] })),
      ...Array.from({ length: 7 }, () => ({ tags: ["Rocky"] })),
      ...Array.from({ length: 3 }, () => ({ tags: ["Scenic"] })),
    ];
    const monthlyReviews = [
      ...Array.from({ length: 5 }, () => ({ tags: ["Muddy"] })),
      ...Array.from({ length: 2 }, () => ({ tags: ["Rocky"] })),
    ];

    expect(getTopReviewTags(allReviews, monthlyReviews)).toEqual([
      { tag: "muddy", count: 5 },
      { tag: "rocky", count: 2 },
      { tag: "scenic", count: 0 },
    ]);
  });

  it("counts each tag at most once per review", () => {
    expect(
      getTopReviewTags(
        [{ tags: ["Muddy", "muddy"] }],
        [{ tags: ["Muddy", "muddy"] }],
      ),
    ).toEqual([{ tag: "muddy", count: 1 }]);
  });
});
