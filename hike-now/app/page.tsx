import Footer from "./components/footer";
import Navbar from "./components/session-navbar";
import FeaturedTrails from "./components/featured-trails";

import { getHikes, getHikeReviewAverages } from "./actions/hikes";

export default async function Home() {
  const [hikes, ratingRows] = await Promise.all([
    getHikes(),
    getHikeReviewAverages(),
  ]);
  const ratingsByHikeId = new Map(
    ratingRows.map(({ hikeId, averageRating }) => [hikeId, averageRating]),
  );
  const featuredTrails = hikes.slice(0, 8).map((trail) => ({
    ...trail,
    rating: ratingsByHikeId.get(trail.id) ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-10 md:px-16">
        <FeaturedTrails trails={featuredTrails} />
      </main>

      <Footer />
    </div>
  );
}