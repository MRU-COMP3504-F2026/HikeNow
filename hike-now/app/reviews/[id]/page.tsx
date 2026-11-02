import Link from "next/link";
import Footer from "../../components/footer";
import { UserIcon } from "../../components/icons";
import Navbar from "../../components/navbar";
import StarRating from "../../components/star-rating";
import Tag from "../../components/tag";

// Import raw JSON data files
import hikesData from "../../../temporary_data/hikes.json";
import hikersData from "../../../temporary_data/hikers.json";
import reviewsData from "../../../temporary_data/reviews.json";

type ReviewUI = {
  id: string;
  rating: number;
  condition: "good" | "neutral" | "bad";
  tags: string[];
  title: string;
  comment: string;
  author: string;
  photoUrl?: string;
};

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export async function generateStaticParams() {
  return hikesData.map((hike) => ({
    id: hike.id.toString(),
  }));
}
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
              <p className="text-small font-medium text-text capitalize">
                {review.author}
              </p>
            </div>
          </div>
        </div>

        {/* Review photos */}
        <div className="flex gap-4">
          <PhotoPlaceholder />
        </div>
      </div>
    </article>
  );
}

type TagSummary = {
  tag: string;
  count: number;
};

function getTopTags(reviews: ReviewUI[], limit = 5): TagSummary[] {
  const counts = new Map<string, number>();

  reviews.forEach((review) => {
    review.tags.forEach((tag) => {
      const normalizedTag = tag.trim().toLowerCase();

      if (normalizedTag) {
        counts.set(normalizedTag, (counts.get(normalizedTag) ?? 0) + 1);
      }
    });
  });

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export default async function ReviewsPage({ params }: PageProps) {
  // Extract and resolve route parameter
  const resolvedParams = await params;
  const trailId = resolvedParams.id;

  // 1. Check & match the hike by ID from hikes.json
  const currentHike = hikesData.find((h) => h.id === trailId) || hikesData[0];

  // 2. Filter reviews strictly where review.hikeId === currentHike.id
  const formattedReviews: ReviewUI[] = reviewsData
    .filter((r) => r.hikeId === currentHike.id)
    .map((r) => {

      
      // Find corresponding hiker by ID
      const hiker = hikersData.find((h) => h.id === r.hikerId);

      const conditionMap: Record<string, "good" | "neutral" | "bad"> = {
        good: "good",
        mild: "neutral",
        bad: "bad",
      };

      return {
        id: r.id,
        rating: Math.round(Number(r.rating)),
        condition: conditionMap[r.condition] || "good",
        tags: r.tags ? r.tags.split(", ").map((t) => t.trim()) : [],
        title: r.title,
        comment: r.comments,
        author: hiker ? hiker.email.split("@")[0] : "Anonymous Hiker",
        photoUrl: r.photo,
      };
    });

    const topTags = getTopTags(formattedReviews);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        {/* Trail heading */}
        <section className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-title font-semibold text-ink">
              {currentHike.name}
            </h1>

            <p className="mt-2 text-heading font-semibold text-ink">
              ★ {currentHike.rating} ({formattedReviews.length} reviews) ·{" "}
              {currentHike.length} km · {currentHike.difficulty}
            </p>
          </div>

          {/* Leave review button */}
          <Link
            href={`/reviews/${currentHike.id}/new`}
            className="flex cursor-pointer items-center gap-3 self-start text-heading text-primary transition-opacity hover:opacity-80"
          >
            <span>Leave a review</span>

            <span className="flex size-8 items-center justify-center rounded-full border-2 border-primary leading-none pb-[1.5px]">
              +
            </span>
          </Link>
        </section>

        {topTags.length > 0 && (
  <section className="mb-8">
    <h2 className="mb-3 text-heading font-semibold text-ink">
      Trail Conditions
    </h2>

    <div className="flex flex-wrap gap-3">
      {topTags.map(({ tag, count }) => (
        <div
          key={tag}
          className="flex items-center gap-2 rounded-control border border-border bg-background px-3 py-2"
        >
          <Tag className="capitalize">{tag}</Tag>
          <span className="text-small text-text-subtle">
            {count}
          </span>
        </div>
      ))}
    </div>
  </section>
)}

        {/* Reviews list - rendered only if review.hikeId matches target trail ID */}
        <section
          className="flex flex-col gap-4"
          aria-label="Trail reviews"
        >
          {formattedReviews.length > 0 ? (
            formattedReviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))
          ) : (
            <p className="text-text-subtle">
              No reviews submitted for this trail yet.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}