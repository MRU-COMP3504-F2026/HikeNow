import { notFound } from "next/navigation";
import { Suspense } from "react";
import FollowButton from "../../components/follow-button";
import Footer from "../../components/footer";
import Navbar from "../../components/session-navbar";
import ReviewCard, { type ReviewCondition } from "../../components/review-card";
import UserProfile from "../../components/user-profile";
import DeleteAccount from "../../components/delete-account";
import EditProfile from "../../components/edit-profile";
import { getCurrentUser } from "../../lib/session";

// Import Server Actions
import { getHikers, getHikerById } from "../../actions/hikers";
import { getReviews } from "../../actions/reviews";
import { getHikes } from "../../actions/hikes";
import { getFollowers, getFollowing } from "../../actions/follows";
import { hikerName } from "../../lib/hiker-search";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

const conditionMap: Record<string, ReviewCondition> = {
  good: "good",
  mild: "fair",
  bad: "poor",
};

// Dynamically generate static params from PostgreSQL hikers
export async function generateStaticParams() {
  const hikers = await getHikers();
  return hikers.map((hiker) => ({ id: hiker.id }));
}

// Lo que depende de la URL (`params`) y de la base de datos va dentro de
// <Suspense>, como pide Next.js con Cache Components. Navbar y Footer salen al instante.
export default function ProfilePage({ params }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-10 md:px-16">
        <Suspense fallback={<ProfileSkeleton />}>
          <ProfileContent params={params} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading profile" className="flex animate-pulse gap-6">
      <div className="size-28 shrink-0 rounded-full bg-surface" />
      <div className="flex flex-1 flex-col gap-3">
        <div className="h-7 w-48 rounded-control bg-surface" />
        <div className="h-5 w-64 rounded-control bg-surface" />
        <div className="h-12 max-w-2xl rounded-control bg-surface" />
      </div>
    </div>
  );
}

async function ProfileContent({ params }: PageProps) {
  const { id } = await params;

  // Fetch all required data concurrently from PostgreSQL
  const [hiker, reviewsData, hikesData, currentUser] = await Promise.all([
    getHikerById(id),
    getReviews(),
    getHikes(),
    getCurrentUser(),
  ]);

  if (!hiker) notFound();
  const isOwnProfile = currentUser?.id === hiker.id;

  const [followers, following] = await Promise.all([
    getFollowers(hiker.id),
    getFollowing(hiker.id),
  ]);

  const displayName = hikerName(hiker.email, hiker.displayName);

  // Filter reviews written by this hiker
const reviews = reviewsData
  .filter((review) => review.hikerId === hiker.id)
  .sort((a, b) => {
    // Reviews with a hike date appear before older reviews that do not have one.
    if (a.hikeDate && b.hikeDate) {
      const dateCompare = b.hikeDate.localeCompare(a.hikeDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }
    }

    if (a.hikeDate && !b.hikeDate) {
      return -1;
    }

    if (!a.hikeDate && b.hikeDate) {
      return 1;
    }

    // Use the review submission date as a fallback.
    const aCreated = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bCreated = b.createdAt ? Date.parse(b.createdAt) : 0;

    return bCreated - aCreated;
  })
  .map((review) => {
    const hike = hikesData.find((hike) => hike.id === review.hikeId);

    return {
      id: review.id,
      rating: Math.round(Number(review.rating ?? 0)),
      condition: conditionMap[review.condition ?? ""] ?? "good",
      tags: review.tags
        ? review.tags.split(", ").map((tag) => tag.trim()).filter(Boolean)
        : [],
      title: review.title ?? "Untitled Review",
      comments: review.comments ?? "",
      photo: review.photo ?? null,
      trailName: hike?.name ?? "Unknown trail",
      trailHref: hike ? `/reviews/${hike.id}` : undefined,
      hikeId: review.hikeId,
      hikeDate: review.hikeDate ?? null,
      createdAt: review.createdAt,
    };
  });


  const trailsReviewed = new Set(reviews.map((r) => r.hikeId)).size;

  return (
    <>
        {isOwnProfile && <p className="mb-6 text-heading font-semibold text-primary">Your dashboard</p>}
        <UserProfile
          name={displayName}
          email={hiker.email}
          description={hiker.description ?? undefined}
          stats={[
            { label: "Joined", value: hiker.joinedAt ? new Date(hiker.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "Not recorded" },
            { label: "Reviews", value: reviews.length },
            { label: "Trails reviewed", value: trailsReviewed },
            { label: "Followers", value: followers.length },
            { label: "Following", value: following.length },
          ]}
          action={isOwnProfile ? undefined : (
            <div className="flex flex-wrap gap-2">
              <FollowButton
                key={hiker.id}
                name={displayName}
                followerId={currentUser?.id}
                followeeId={hiker.id}
                initialFollowing={followers.some((row) => row.followerId === currentUser?.id)}
              />
            </div>
          )}
          className={isOwnProfile ? "mb-6" : "mb-10"}
        />
        {isOwnProfile && (
          <EditProfile
            defaultName={hikerName(hiker.email)}
            initialProfile={{ displayName: hiker.displayName, bio: hiker.description }}
            className="mb-10"
          />
        )}

        <h2 className="mb-4 text-heading font-semibold text-ink">
          Review history ({reviews.length})
        </h2>

        <section className="flex flex-col gap-4" aria-label="Reviews by this hiker">
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.id}>


                <ReviewCard
                  rating={r.rating}
                  condition={r.condition}
                  tags={r.tags}
                  title={r.title}
                  comments={r.comments}
                  trailName={r.trailName}
                  trailHref={r.trailHref}
                  hikeDate={r.hikeDate ?? undefined}
                  date={r.createdAt ?? undefined}
                  photos={r.photo ? [r.photo] : []}
                />
              </div>
            ))
          ) : (
            <p className="text-text-subtle">
              {displayName} hasn&apos;t written any reviews yet.
            </p>
          )}
        </section>
        {isOwnProfile && <DeleteAccount />}
    </>
  );
}
