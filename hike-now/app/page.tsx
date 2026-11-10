import Footer from "./components/footer";
import Navbar from "./components/session-navbar";
import FeaturedTrails from "./components/featured-trails";

// Import Server Action
import { getHikes } from "./actions/hikes";

export default async function Home() {
  // Fetch hikes from PostgreSQL
  const hikes = await getHikes();
  const featuredTrails = hikes.slice(0, 8);

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