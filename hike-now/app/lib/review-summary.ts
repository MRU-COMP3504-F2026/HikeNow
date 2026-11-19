type ReviewRating = {
  rating: number | string | null | undefined;
};

export function getAverageReviewRating(reviews: ReviewRating[]): number | null {
  const ratings = reviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

  if (ratings.length === 0) {
    return null;
  }

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}
