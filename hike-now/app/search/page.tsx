import Link from "next/link";
import { Suspense } from "react";
import { getHikers } from "../actions/hikers";
import { getHikes } from "../actions/hikes";
import Footer from "../components/footer";
import { UserIcon } from "../components/icons";
import Navbar from "../components/session-navbar";
import { hikerName, matchHikers, matchHikes, profileHref } from "../lib/hiker-search";

type PageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export const metadata = { title: "Search | Hike Now" };

export default function SearchPage({ searchParams }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-10 md:px-16">
        <Suspense fallback={<p className="text-text-subtle">Searching...</p>}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

async function SearchResults({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 100) ?? "";

  if (!query) {
    return (
      <>
        <h1 className="mb-4 text-title font-semibold text-ink">Search</h1>
        <p className="text-text-subtle">Type a hiker or trail name in the search box.</p>
      </>
    );
  }

  const [allHikers, allHikes] = await Promise.all([getHikers(), getHikes()]);
  const hikers = matchHikers(allHikers, query);
  const hikes = matchHikes(allHikes, query);

  return (
    <>
      <h1 className="mb-8 text-title font-semibold text-ink">
        Results for &ldquo;{query}&rdquo;
      </h1>

      <section aria-label="Hikers" className="mb-10">
        <h2 className="mb-4 text-heading font-semibold text-ink">Hikers ({hikers.length})</h2>
        {hikers.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {hikers.map((h) => (
              <li key={h.id}>
                <Link
                  href={profileHref(h.id)}
                  className="flex items-center gap-4 rounded-control border border-border-soft p-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
                    <UserIcon size={24} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-nav font-medium text-ink">{hikerName(h.email)}</span>
                    {h.description && (
                      <span className="truncate text-small text-text-muted">{h.description}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-subtle">No hikers found.</p>
        )}
      </section>

      <section aria-label="Trails">
        <h2 className="mb-4 text-heading font-semibold text-ink">Trails ({hikes.length})</h2>
        {hikes.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {hikes.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/reviews/${h.id}`}
                  className="flex flex-col rounded-control border border-border-soft p-4 transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="text-nav font-medium text-ink">{h.name}</span>
                  {h.location && <span className="text-small text-text-muted">{h.location}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-subtle">No trails found.</p>
        )}
      </section>
    </>
  );
}
