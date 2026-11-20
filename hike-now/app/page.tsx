import { Suspense } from "react";
import Footer from "./components/footer";
import Navbar from "./components/session-navbar";
import FeaturedTrails from "./components/featured-trails";
import { getCurrentUser } from "./lib/session";
import { getHikes, getHikeReviewAverages } from "./actions/hikes";
import { getUserTrailStatuses } from "./actions/get-status";

async function FeaturedTrailsSection() {
  const [user, hikes, ratingRows, userStatuses] = await Promise.all([
    getCurrentUser(),
    getHikes(),
    getHikeReviewAverages(),
    getUserTrailStatuses(),
  ]);

  const ratingsByHikeId = new Map(
    ratingRows.map(({ hikeId, averageRating }) => [hikeId, averageRating]),
  );

  const featuredTrails = hikes.slice(0, 8).map((trail) => ({
    ...trail,
    rating: ratingsByHikeId.get(trail.id) ?? null,
    initialStatus: userStatuses[trail.id] ?? ("not-started" as const),
  }));

  return (
    <FeaturedTrails trails={featuredTrails} isLoggedIn={Boolean(user)} />
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-10 md:px-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-muted" />}>
          <FeaturedTrailsSection />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}