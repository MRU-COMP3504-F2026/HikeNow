import Footer from "./components/footer";
import Navbar from "./components/navbar";
import TrailCard from "./components/trail-card";

// Import Server Action
import { getHikes } from "./actions/hikes";

export default async function Home() {
  // Fetch hikes from PostgreSQL
  const hikes = await getHikes();
  const featuredTrails = hikes.slice(0, 8);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        <section className="mb-8 flex items-center justify-between">
          <h1 className="text-title font-semibold text-primary underline decoration-2 underline-offset-2">
            Hot picks for Fall ’26
          </h1>

          <button
            type="button"
            aria-label="Filter trails"
            className="flex size-10 items-center justify-center text-primary transition-opacity hover:opacity-70"
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
            </svg>
          </button>
        </section>

        <section
          className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Featured hiking trails"
        >
          {featuredTrails.map((trail) => (
            <TrailCard
              key={trail.id}
              name={trail.name}
              location={trail.location ?? "Unknown location"}
              imageUrl={trail.landmarks ?? "/images/placeholder-trail.jpg"}
              rating={Number(trail.rating ?? 0)}
              lengthKm={Number(trail.length ?? 0)}
              difficulty={(trail.difficulty ?? "").replace(" Difficulty", "")}
              href={`/reviews/${trail.id}`}
            />
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}