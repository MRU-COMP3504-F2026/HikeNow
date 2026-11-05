import Footer from "./components/footer";
import Navbar from "./components/navbar";
import TrailCard from "./components/trail-card";

// Import Server Action
import { getHikes } from "./actions/hikes";

type HomeProps = {
  searchParams: Promise<{ search?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  // Fetch hikes from PostgreSQL
  const hikes = await getHikes();

  const { search = "" } = await searchParams;
  const query = search.trim().toLowerCase();

  const displayedTrails = query
    ? hikes.filter((trail) => {
        const searchableText = [
          trail.name,
          trail.description,
          trail.location,
          trail.difficulty,
          trail.equipment,
          trail.landmarks,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
    : hikes.slice(0, 8);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        <section className="mb-8 flex items-center justify-between">
          <h1 className="text-title font-semibold text-primary underline decoration-2 underline-offset-2">
            {query ? `Search results for "${search}"` : "Hot picks for Fall ’26"}
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

        {query && displayedTrails.length === 0 && (
          <p className="mb-8 text-text-subtle">
            No trails found for &quot;{search}&quot;.
          </p>
        )}

        <section
          className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Featured hiking trails"
        >
          {displayedTrails.map((trail) => (
            <TrailCard
              key={trail.id}
              name={trail.name}
              location={trail.location ?? "Unknown location"}
              imageUrl={trail.photo ?? "/images/placeholder-trail.jpg"}
              photoCredit={
                trail.photoCreditAuthor && trail.photoCreditSource
                  ? {
                      author: trail.photoCreditAuthor,
                      source: trail.photoCreditSource,
                      authorHref: trail.photoCreditAuthorHref ?? "#",
                      sourceHref: trail.photoCreditSourceHref ?? "#",
                    }
                  : undefined
              }
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