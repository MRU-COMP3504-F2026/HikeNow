import { Suspense } from "react";
import Footer from "../../../components/footer";
import Navbar from "../../../components/navbar";
import ReviewForm from "../../../components/review-form";
import { getHikes } from "../../../actions/hikes";

// Disable instant blocking route check for parameter resolution
export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const hikes = await getHikes();
  return hikes.map((hike) => ({ id: hike.id }));
}

async function ReviewFormContent({ params }: PageProps) {
  const resolvedParams = await params;
  const trailId = resolvedParams.id;

  const hikes = (await getHikes()) ?? [];

  const trails = hikes.map((h) => ({
    id: h.id,
    name: h.name,
    photo: h.landmarks ?? "/images/placeholder-trail.jpg",
    equipment: h.equipment ?? "",
  }));

  const initialTrailId = trails.some((t) => t.id === trailId)
    ? trailId
    : trails[0]?.id ?? "";

  if (trails.length === 0) {
    return (
      <p className="text-text-subtle">
        No hiking trails found in the database.
      </p>
    );
  }

  return <ReviewForm trails={trails} initialTrailId={initialTrailId} />;
}

export default function LeaveReviewPage({ params }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-8 text-title font-semibold text-primary">
          Leave a review
        </h1>
        <Suspense fallback={<p className="text-text-subtle">Loading review form...</p>}>
          <ReviewFormContent params={params} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}