'use server';

import { db } from "@/app/db";
import { review } from "@/app/db/schema";
import { createClient } from "@/app/db/server";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// 1. SELECT ALL REVIEWS (Cached for prerendering)
export const getReviews = unstable_cache(
  async () => {
    const rows = await db.select().from(review).orderBy(sql`${review.createdAt} desc nulls last`);
    return rows.map((row) => ({ ...row, createdAt: row.createdAt?.toISOString() ?? null }));
  },
  ["all-reviews-v3"],
  { tags: ["reviews"] }
);

// 2. SELECT REVIEW BY ID
export async function getReviewById(id: string) {
  return unstable_cache(
    async () => {
      const [data] = await db.select().from(review).where(eq(review.id, id));
      return data ? { ...data, createdAt: data.createdAt?.toISOString() ?? null } : null;
    },
    [`review-v3-${id}`],
    { tags: ["reviews", `review-${id}`] }
  )();
}

// 3. CREATE REVIEW
export async function createReview(formData: FormData) {
  let user: Awaited<ReturnType<typeof getCurrentUser>>;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Review creation failed:", error);
    return { success: false, error: "Could not save your review. Please try again later." };
  }
  if (!user) redirect("/login");

  try {
    const fields = readReviewFields(formData);
    const hikeId = formData.get("hikeId");
    if (typeof hikeId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(hikeId)) {
      return { success: false, error: "Please select a valid trail." };
    }
    const photoFile = formData.get("photo");

    let photoUrl: string | null = null;

    if (photoFile instanceof File && photoFile.size > 0) {
      const supabase = await createClient();
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
        hikerId: user.id,
        ...fields,
        photo: photoUrl,
      })
      .returning();

    revalidateTag("reviews", { expire: 0 });
    revalidatePath(`/reviews/${hikeId}`);
    revalidatePath("/reviews");
    revalidatePath(`/profile/${user.id}`);

    return { success: true, data: newReview };
  } catch (error) {
    console.error("Review creation failed:", error);
    return { success: false, error: error instanceof ReviewValidationError ? error.message : "Could not save your review. Please try again later." };
  }
}

// 4. UPDATE REVIEW
export async function updateReview(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [existing] = await db.select().from(review).where(and(eq(review.id, id), eq(review.hikerId, user.id)));
  if (!existing) throw new Error("Review not found or not owned by you.");
  const supabase = await createClient();

  const fields = readReviewFields(formData);
  const photoFile = formData.get("photo");

  const updateFields: Partial<typeof review.$inferInsert> = { ...fields };
  if (photoFile instanceof File && photoFile.size > 0) {
    const fileExt = photoFile.name.split(".").pop();
    const fileName = `reviews/${Date.now()}.${fileExt}`;

    const { data: uploadData, error } = await supabase.storage
      .from("hike-reviews")
      .upload(fileName, photoFile, { contentType: photoFile.type });

    if (error) throw new Error(error.message);
    const { data: publicUrlData } = supabase.storage
      .from("hike-reviews")
      .getPublicUrl(uploadData.path);

    updateFields.photo = publicUrlData.publicUrl;
  }

  const [updated] = await db
    .update(review)
    .set(updateFields)
    .where(and(eq(review.id, id), eq(review.hikerId, user.id)))
    .returning();

  revalidateTag("reviews", { expire: 0 });
  revalidateTag(`review-${id}`, { expire: 0 });
  revalidatePath(`/reviews/${id}`);
  revalidatePath(`/reviews/${existing.hikeId}`);
  revalidatePath(`/profile/${user.id}`);

  return updated;
}

// 5. DELETE REVIEW
export async function deleteReview(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const [existing] = await db.select().from(review).where(and(eq(review.id, id), eq(review.hikerId, user.id)));
  if (!existing) throw new Error("Review not found or not owned by you.");

  if (existing?.photo) {
    const filePath = existing.photo.split("/hike-reviews/").pop();
    if (filePath) {
      const { error } = await supabase.storage.from("hike-reviews").remove([filePath]);
      if (error) throw new Error(error.message);
    }
  }

  await db.delete(review).where(and(eq(review.id, id), eq(review.hikerId, user.id)));

  revalidateTag("reviews", { expire: 0 });
  revalidatePath("/reviews");
  revalidateTag(`review-${id}`, { expire: 0 });
  revalidatePath(`/reviews/${existing.hikeId}`);
  revalidatePath(`/profile/${user.id}`);
}

class ReviewValidationError extends Error {}

function readReviewFields(formData: FormData) {
  function text(name: string, max: number) {
    const value = formData.get(name);
    if (typeof value !== "string" || value.length > max) {
      throw new ReviewValidationError(`Invalid ${name}; maximum length is ${max} characters.`);
    }
    return value.trim();
  }
  const title = text("title", 255);
  const rating = text("rating", 4);
  const condition = text("condition", 255);
  if (!title) throw new ReviewValidationError("Please enter a title for your review.");
  if (!/^[1-5]$/.test(rating)) throw new ReviewValidationError("Please rate the trail from 1 to 5.");
  if (!["good", "mild", "bad"].includes(condition)) {
    throw new ReviewValidationError("Please specify the trail condition.");
  }
  return { title, rating, condition, tags: text("tags", 255), comments: text("comments", 500) };
}