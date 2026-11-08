import { Suspense } from "react";
import Footer from "../../../components/footer";
import Navbar from "../../../components/session-navbar";
import ReviewForm from "../../../components/review-form";
import { getHikes } from "../../../actions/hikes";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/session";

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
  if (!await getCurrentUser()) redirect("/login");
  const resolvedParams = await params;
  const trailId = resolvedParams.id;

  const hikes = (await getHikes()) ?? [];

  const hike = hikes.find((h) => h.id === trailId);
  if (!hike) notFound();

  return <ReviewForm trail={{
    id: hike.id,
    name: hike.name,
    photo: hike.photo ?? "/images/placeholder-trail.jpg",
    equipment: hike.equipment ?? "",
  }} />;
}

export default function LeaveReviewPage({ params }: PageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

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