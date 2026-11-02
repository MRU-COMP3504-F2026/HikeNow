import Footer from "../../components/footer";
import Navbar from "../../components/navbar";
import ReviewForm from "../../components/review-form";
import { getHikes } from "../../actions/hikes";

export const instant = false;

export default async function NewReviewPage() {
  // Fetch hiking trails dynamically from PostgreSQL
  const hikes = (await getHikes()) ?? [];

  const trails = hikes.map((h) => ({
    id: h.id,
    name: h.name,
    photo: h.landmarks ?? "/images/placeholder-trail.jpg",
    equipment: h.equipment ?? "",
  }));

  const initialTrailId = trails[0]?.id ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-8 text-title font-semibold text-primary">
          Leave a review
        </h1>
        {trails.length > 0 ? (
          <ReviewForm trails={trails} initialTrailId={initialTrailId} />
        ) : (
          <p className="text-text-subtle">
            No hiking trails found in the database.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}