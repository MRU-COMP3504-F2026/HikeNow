type TaggedReview = {
  tags: string[];
};

type TagSummary = {
  tag: string;
  count: number;
};

function countReviewTags(reviews: TaggedReview[]) {
  const counts = new Map<string, number>();

  reviews.forEach((review) => {
    const tags = new Set(
      review.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    );

    tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return counts;
}

export function getTopReviewTags(
  allReviews: TaggedReview[],
  visibleReviews: TaggedReview[],
  limit = 5,
): TagSummary[] {
  const allTimeCounts = countReviewTags(allReviews);
  const visibleCounts = countReviewTags(visibleReviews);

  return Array.from(allTimeCounts.entries())
    .sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
    .slice(0, limit)
    .map(([tag]) => ({ tag, count: visibleCounts.get(tag) ?? 0 }));
}
