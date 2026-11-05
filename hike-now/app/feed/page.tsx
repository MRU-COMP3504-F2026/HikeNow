import { Suspense } from "react";

import { getFollowing } from "../actions/follows";
import { getHikers } from "../actions/hikers";
import { getHikes } from "../actions/hikes";
import { getReviews } from "../actions/reviews";

import Footer from "../components/footer";
import Navbar from "../components/session-navbar";
import { getCurrentUser } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { profileHref } from "../lib/hiker-search";
import ReviewCard, {
  type ReviewCondition,
} from "../components/review-card";

const conditionMap: Record<string, ReviewCondition> = {
  good: "good",
  mild: "fair",
  bad: "poor",
};

export default function FeedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-8 text-title font-semibold text-ink">
          Following Feed
        </h1>

        <Suspense fallback={<FeedSkeleton />}>
          <FeedContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading feed"
      className="flex flex-col gap-4"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-control bg-surface"
        />
      ))}
    </div>
  );
}

async function FeedContent() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  const [hikers, reviews, hikes] = await Promise.all([
    getHikers(),
    getReviews(),
    getHikes(),
  ]);

  const following = await getFollowing(currentUser.id);

  const followedUserIds = new Set(
    following.map((relationship) => relationship.followeeId),
  );

  const feedItems = reviews
    .filter((review) => followedUserIds.has(review.hikerId))
    .slice(0, 20)
    .map((review) => {
      const author = hikers.find(
        (hiker) => hiker.id === review.hikerId,
      );

      const trail = hikes.find(
        (hike) => hike.id === review.hikeId,
      );

      return {
        id: review.id,
        authorHref: author ? profileHref(author.id) : undefined,
        rating: Math.round(Number(review.rating ?? 0)),
        condition: conditionMap[review.condition ?? ""] ?? "good",
        tags: review.tags
          ? review.tags.split(",").map((tag) => tag.trim())
          : [],
        title: review.title ?? "Untitled Review",
        comments: review.comments ?? "",
        author: author
          ? author.email.split("@")[0]
          : "Anonymous Hiker",
        trailName: trail?.name ?? "Unknown trail",
        trailHref: trail
          ? `/reviews/${trail.id}`
          : undefined,
        photos: review.photo ? [review.photo] : [],
      };
    });

  if (feedItems.length === 0) {
    return (
      <div className="rounded-control border border-border-soft p-6">
        <h2 className="text-heading font-semibold text-ink">
          No activity yet
        </h2>
        <p className="mt-2 text-small text-text-subtle">
          Reviews from people you follow will appear here.
        </p>
      </div>
    );
  }

  return (
    <section
      className="flex flex-col gap-4"
      aria-label="Recent activity from followed hikers"
    >
      {feedItems.map((item) => (
        <ReviewCard
          key={item.id}
          rating={item.rating}
          condition={item.condition}
          tags={item.tags}
          title={item.title}
          comments={item.comments}
          author={item.author}
          authorHref={item.authorHref}
          trailName={item.trailName}
          trailHref={item.trailHref}
          photos={item.photos}
        />
      ))}
    </section>
  );
}