import { notFound } from "next/navigation";
import Footer from "../../components/footer";
import Navbar from "../../components/navbar";
import ReviewCard, { type ReviewCondition } from "../../components/review-card";
import UserProfile from "../../components/user-profile";

// Datos temporales hasta conectar la base de datos
import hikesData from "../../../temporary_data/hikes.json";
import hikersData from "../../../temporary_data/hikers.json";
import reviewsData from "../../../temporary_data/reviews.json";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

const conditionMap: Record<string, ReviewCondition> = {
  good: "good",
  mild: "fair",
  bad: "poor",
};

export async function generateStaticParams() {
  return hikersData.map((hiker) => ({ id: hiker.id }));
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const hiker = hikersData.find((h) => h.id === id);
  if (!hiker) notFound();

  const name = hiker.email.split("@")[0];
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  const reviews = reviewsData
    .filter((r) => r.hikerId === hiker.id)
    .map((r) => {
      const hike = hikesData.find((h) => h.id === r.hikeId);
      return {
        id: r.id,
        rating: Math.round(Number(r.rating)),
        condition: conditionMap[r.condition] ?? "good",
        tags: r.tags ? r.tags.split(", ").map((t) => t.trim()) : [],
        title: r.title,
        comments: r.comments,
        photo: r.photo,
        trailName: hike?.name ?? "Unknown trail",
        trailHref: hike ? `/reviews/${hike.id}` : undefined,
        hikeId: r.hikeId,
      };
    });

  const trailsReviewed = new Set(reviews.map((r) => r.hikeId)).size;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        <UserProfile
          name={displayName}
          email={hiker.email}
          description={hiker.description}
          stats={[
            { label: "Reviews", value: reviews.length },
            { label: "Trails reviewed", value: trailsReviewed },
          ]}
          className="mb-10"
        />

        <h2 className="mb-4 text-heading font-semibold text-ink">
          Reviews ({reviews.length})
        </h2>

        <section className="flex flex-col gap-4" aria-label="Reviews by this hiker">
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <ReviewCard
                key={r.id}
                rating={r.rating}
                condition={r.condition}
                tags={r.tags}
                title={r.title}
                comments={r.comments}
                trailName={r.trailName}
                trailHref={r.trailHref}
                photos={r.photo ? [r.photo] : []}
              />
            ))
          ) : (
            <p className="text-text-subtle">
              {displayName} hasn&apos;t written any reviews yet.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
