import Footer from "../components/footer";
import { UserIcon } from "../components/icons";
import Navbar from "../components/navbar";
import StarRating from "../components/star-rating";
import Tag from "../components/tag";

type Review = {
  id: number;
  rating: number;
  condition: "good" | "neutral" | "bad";
  tag: string;
  title: string;
  comment: string;
  author: string;
  date: string;
};

const reviews: Review[] = [
  {
    id: 1,
    rating: 4,
    condition: "good",
    tag: "Muddy",
    title: "Nice place",
    comment:
      "The views are incredibly beautiful! Got in there just for the first snow and I loved it!",
    author: "Lisa Park",
    date: "Oct 10, 2026",
  },
  {
    id: 2,
    rating: 4,
    condition: "good",
    tag: "Crowded",
    title: "Nice place",
    comment:
      "The views are incredibly beautiful! Got in there just for the first snow and I loved it!",
    author: "Lisa Park",
    date: "Oct 10, 2026",
  },
  {
    id: 3,
    rating: 4,
    condition: "good",
    tag: "Snowy",
    title: "Nice place",
    comment:
      "The views are incredibly beautiful! Got in there just for the first snow and I loved it!",
    author: "Lisa Park",
    date: "Oct 10, 2026",
  },
];

function ConditionIcons({
  selected,
}: {
  selected: Review["condition"];
}) {
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
        <path
          d="M4 42 22 21l10 12 8-9 18 18H4Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-control border border-border bg-background p-4 shadow-control">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left side */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <StarRating value={review.rating} />

            <ConditionIcons selected={review.condition} />

            <Tag className="px-2 py-1">
              {review.tag}
            </Tag>
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
              <p className="text-small font-medium text-text">
                {review.author}
              </p>
              <p className="text-small text-text-subtle">
                {review.date}
              </p>
            </div>
          </div>
        </div>

        {/* Review photos */}
        <div className="flex gap-4">
          <PhotoPlaceholder />
          <PhotoPlaceholder />
        </div>
      </div>
    </article>
  );
}

export default function ReviewsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        {/* Trail heading */}
        <section className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-title font-semibold text-ink">
              Lake Agnes - Mirror Lake - Lake Louise
            </h1>

            <p className="mt-2 text-heading font-semibold text-ink">
              ★ 4.2 (38 reviews) · 6.1 km · Easy Difficulty
            </p>
          </div>

          {/* Leave review button */}
          <button
            type="button"
            className="flex cursor-pointer items-center gap-3 self-start text-heading text-primary transition-opacity hover:opacity-80"
          >
            <span>Leave a review</span>

            <span className="flex size-9 items-center justify-center rounded-full border-2 border-primary text-2xl leading-none">
              +
            </span>
          </button>
        </section>

        {/* Reviews */}
        <section
          className="flex flex-col gap-4"
          aria-label="Trail reviews"
        >
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}