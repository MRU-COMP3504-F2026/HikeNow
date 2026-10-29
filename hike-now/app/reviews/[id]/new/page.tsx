import Footer from "../../../components/footer";
import Navbar from "../../../components/navbar";
import ReviewForm from "../../../components/review-form";

import hikesData from "../../../../temporary_data/hikes.json";

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export async function generateStaticParams() {
  return hikesData.map((hike) => ({ id: hike.id.toString() }));
}

export default async function LeaveReviewPage({ params }: PageProps) {
  const { id } = await params;
  const trails = hikesData.map(({ id, name, photo, equipment }) => ({
    id,
    name,
    photo,
    equipment,
  }));
  const initialTrailId = trails.some((t) => t.id === id) ? id : trails[0].id;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar user={{ email: "hshar360" }} />

      <main className="flex-1 px-4 py-10 md:px-16">
        <h1 className="mb-8 text-title font-semibold text-primary">
          Leave a review
        </h1>
        <ReviewForm trails={trails} initialTrailId={initialTrailId} />
      </main>

      <Footer />
    </div>
  );
}
