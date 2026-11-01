'use server';

import { db } from "@/app/db";
import { review } from "@/app/db/schema";
import { createClient } from "@/app/db/server";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// 1. SELECT ALL REVIEWS (Cached for prerendering)
export const getReviews = unstable_cache(
  async () => {
    return await db.select().from(review);
  },
  ["all-reviews"],
  { tags: ["reviews"] }
);

// 2. SELECT REVIEW BY ID
export async function getReviewById(id: string) {
  return unstable_cache(
    async () => {
      const [data] = await db.select().from(review).where(eq(review.id, id));
      return data || null;
    },
    [`review-${id}`],
    { tags: [`review-${id}`] }
  )();
}

// 3. CREATE REVIEW
export async function createReview(formData: FormData) {
  try {
    const supabase = await createClient();

    const hikeId = formData.get("hikeId") as string;
    const hikerId = formData.get("hikerId") as string;
    const rating = formData.get("rating") as string;
    const tags = formData.get("tags") as string;
    const condition = formData.get("condition") as string;
    const comments = formData.get("comments") as string;
    const title = formData.get("title") as string;
    const photoFile = formData.get("photo") as File | null;

    let photoUrl: string | null = null;

    if (photoFile && photoFile.size > 0) {
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `reviews/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("hike-reviews")
        .upload(fileName, photoFile, { contentType: photoFile.type });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from("hike-reviews")
        .getPublicUrl(uploadData.path);

      photoUrl = publicUrlData.publicUrl;
    }

    const [newReview] = await db
      .insert(review)
      .values({
        hikeId,
        hikerId,
        rating,
        tags,
        condition,
        comments,
        title,
        photo: photoUrl,
      })
      .returning();

    revalidateTag("reviews", { expire: 0 });
    revalidatePath(`/reviews/${hikeId}`);
    revalidatePath("/reviews");

    return { success: true, data: newReview };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. UPDATE REVIEW
export async function updateReview(id: string, formData: FormData) {
  const supabase = await createClient();

  const rating = formData.get("rating") as string;
  const tags = formData.get("tags") as string;
  const condition = formData.get("condition") as string;
  const comments = formData.get("comments") as string;
  const title = formData.get("title") as string;
  const photoFile = formData.get("photo") as File | null;

  let updateFields: Record<string, any> = { rating, tags, condition, comments, title };

  if (photoFile && photoFile.size > 0) {
    const fileExt = photoFile.name.split(".").pop();
    const fileName = `reviews/${Date.now()}.${fileExt}`;

    const { data: uploadData, error } = await supabase.storage
      .from("hike-reviews")
      .upload(fileName, photoFile, { contentType: photoFile.type });

    if (!error) {
      const { data: publicUrlData } = supabase.storage
        .from("hike-reviews")
        .getPublicUrl(uploadData.path);

      updateFields.photo = publicUrlData.publicUrl;
    }
  }

  const [updated] = await db
    .update(review)
    .set(updateFields)
    .where(eq(review.id, id))
    .returning();

  revalidateTag("reviews", { expire: 0 });
  revalidateTag(`review-${id}`, { expire: 0 });
  revalidatePath(`/reviews/${id}`);

  return updated;
}

// 5. DELETE REVIEW
export async function deleteReview(id: string) {
  const supabase = await createClient();

  const [existing] = await db.select().from(review).where(eq(review.id, id));

  if (existing?.photo) {
    const filePath = existing.photo.split("/hike-reviews/").pop();
    if (filePath) {
      await supabase.storage.from("hike-reviews").remove([filePath]);
    }
  }

  await db.delete(review).where(eq(review.id, id));

  revalidateTag("reviews", { expire: 0 });
  revalidatePath("/reviews");
}