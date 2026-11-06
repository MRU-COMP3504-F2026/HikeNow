import Footer from "../../components/footer";
import Navbar from "../../components/session-navbar";
import ReviewForm from "../../components/review-form";
import { getHikes } from "../../actions/hikes";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/session";

export const instant = false;

async function NewReviewForm() {
  if (!await getCurrentUser()) redirect("/login");
  // Fetch hiking trails dynamically from PostgreSQL
  const hikes = (await getHikes()) ?? [];

  const trails = hikes.map((h) => ({
    id: h.id,
    name: h.name,
    photo: h.photo ?? "/images/placeholder-trail.jpg",
    equipment: h.equipment ?? "",
  }));

  const initialTrailId = trails[0]?.id ?? "";

  return trails.length > 0 ? (
    <ReviewForm trails={trails} initialTrailId={initialTrailId} />
  ) : (
    <p className="text-text-subtle">No hiking trails found in the database.</p>
  );
}

export default function NewReviewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-8 text-title font-semibold text-primary">
          Leave a review
        </h1>
        <Suspense fallback={<p className="text-text-subtle">Loading review form...</p>}>
          <NewReviewForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}