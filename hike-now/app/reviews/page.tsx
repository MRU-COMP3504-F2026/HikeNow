import Link from "next/link";
import Footer from "../components/footer";
import { UserIcon } from "../components/icons";
import Navbar from "../components/navbar";
import StarRating from "../components/star-rating";
import Tag from "../components/tag";

// Import the Server Actions created previously
import { getReviews } from "../actions/reviews";
import { getHikers } from "../actions/hikers";
import { getHikes } from "../actions/hikes";

type ReviewUI = {
  id: string;
  rating: number;
  condition: "good" | "neutral" | "bad";
  tags: string[];
  title: string;
  comment: string;
  author: string;
  trailName: string;
  photoUrl?: string;
};

function ConditionIcons({ selected }: { selected: ReviewUI["condition"] }) {
  const conditions = [
    { key: "good", mouth: "M8 14s1.5 2 4 2 4-2 4-2" },
    { key: "neutral", mouth: "M9 15h6" },
    { key: "bad", mouth: "M8 17s1.5-2 4-2 4 2 4 2" },
  ] as const;

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Trail condition: ${selected}`}
    >
      {conditions.map(({ key, mouth }) => {
        const active = key === selected;

        return (
          <svg
            key={key}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={active ? "text-primary" : "text-border"}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="9" cy="10" r="0.75" fill="currentColor" />
            <circle cx="15" cy="10" r="0.75" fill="currentColor" />
            <path d={mouth} />
          </svg>
        );
      })}
    </div>
  );
}

function PhotoPlaceholder() {
  return (
    <div
      className="flex h-28 w-28 shrink-0 items-center justify-center rounded-lg bg-primary md:h-32 md:w-32"
      aria-label="Review photo placeholder"
    >
      <svg
        width="62"
        height="48"
        viewBox="0 0 62 48"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 42 22 21l10 12 8-9 18 18H4Z" fill="white" />
      </svg>
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewUI }) {
  return (
    <article className="rounded-control border border-border bg-background p-4 shadow-control">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left side */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <StarRating value={review.rating} />

            <ConditionIcons selected={review.condition} />

            {review.tags.map((tagText) => (
              <Tag key={tagText} className="px-2 py-1 capitalize">
                {tagText}
              </Tag>
            ))}
          </div>

          <h2 className="mb-1 text-nav font-semibold text-ink">
            {review.title}
          </h2>

          <p className="mb-5 max-w-2xl text-small leading-5 text-text">
            {review.comment}
          </p>

          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-on-primary">
              <UserIcon size={15} />
            </span>

            <div>
              <p className="text-small font-medium capitalize text-text">
                {review.author} ·{" "}
                <span className="font-normal text-text-subtle">
                  {review.trailName}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Review photo from Supabase Storage or Fallback Placeholder */}
        <div className="flex gap-4">
          {review.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={review.photoUrl}
              alt={review.title}
              className="h-28 w-28 shrink-0 rounded-lg object-cover md:h-32 md:w-32"
            />
          ) : (
            <PhotoPlaceholder />
          )}
        </div>
      </div>
    </article>
  );
}

export default async function ReviewsPage() {
  // Fetch database records concurrently using the server actions
  const [reviewsData, hikersData, hikesData] = await Promise.all([
    getReviews(),
    getHikers(),
    getHikes(),
  ]);

  const conditionMap: Record<string, "good" | "neutral" | "bad"> = {
    good: "good",
    mild: "neutral",
    bad: "bad",
  };

  // Map database entity schema to UI structure
  const formattedReviews: ReviewUI[] = reviewsData
    .slice(0, 8)
    .map((r) => {
      const hiker = hikersData.find((h) => h.id === r.hikerId);
      const hike = hikesData.find((h) => h.id === r.hikeId);

      return {
        id: r.id,
        rating: Math.round(Number(r.rating ?? 0)),
        condition: conditionMap[r.condition ?? ""] || "good",
        tags: r.tags ? r.tags.split(", ").map((t) => t.trim()) : [],
        title: r.title ?? "Untitled Review",
        comment: r.comments ?? "",
        author: hiker ? hiker.email.split("@")[0] : "Anonymous Hiker",
        trailName: hike ? hike.name : "Unknown Trail",
        photoUrl: r.photo ?? undefined,
      };
    });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        {/* Section Heading */}
        <section className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-title font-semibold text-ink">
              Latest Reviews
            </h1>
          </div>

          {/* Leave review button */}
          <Link
            href="/reviews/new"
            className="flex cursor-pointer items-center gap-3 self-start text-heading text-primary transition-opacity hover:opacity-80"
          >
            <span>Leave a review</span>

            <span className="flex size-8 items-center justify-center rounded-full border-2 border-primary pb-[1.5px] leading-none">
              +
            </span>
          </Link>
        </section>

        {/* Reviews list */}
        <section
          className="flex flex-col gap-4"
          aria-label="Trail reviews"
        >
          {formattedReviews.length > 0 ? (
            formattedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          ) : (
            <p className="text-text-subtle">No reviews submitted yet.</p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}