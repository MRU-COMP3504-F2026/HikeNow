'use server';

import { db } from "@/app/db";
import { review } from "@/app/db/schema";
import { createClient } from "@/app/db/server";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { randomUUID } from "node:crypto";
import {
  REVIEW_PHOTO_BUCKET, REVIEW_PHOTO_TYPES, isOwnedReviewPhotoPath, reviewPhotoError,
} from "@/app/lib/review-photos";

// 1. SELECT ALL REVIEWS (Cached for prerendering)
export const getReviews = unstable_cache(
  async () => {
    const rows = await db
      .select()
      .from(review)
      .orderBy(
        sql`${review.hikeDate} desc nulls last`,
        sql`${review.createdAt} desc nulls last`
      );

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt?.toISOString() ?? null,
    }));
  },
  ["all-reviews-v4"],
  { tags: ["reviews"] }
);

// 2. SELECT REVIEW BY ID
export async function getReviewById(id: string) {
  return unstable_cache(
    async () => {
      const [data] = await db
        .select()
        .from(review)
        .where(eq(review.id, id));

      if (!data) {
        return null;
      }

      return {
        ...data,
        createdAt: data.createdAt?.toISOString() ?? null,
      };
    },
    [`review-v4-${id}`],
    { tags: ["reviews", `review-${id}`] }
  )();
}

// 3. SIGN A REVIEW PHOTO UPLOAD
// The browser uploads straight to Supabase Storage with this token (standard presigned upload),
// so photos never pass through the Server Action body limit.
export async function createReviewPhotoUpload(photo: { type: string; size: number }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const invalid = reviewPhotoError(photo);
  if (invalid) return { success: false as const, error: invalid };

  const path = `reviews/${user.id}/${randomUUID()}.${REVIEW_PHOTO_TYPES[photo.type]}`;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(REVIEW_PHOTO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Review photo upload signing failed:", error);
    return { success: false as const, error: "Could not upload your photo. Please try again later." };
  }
  return { success: true as const, path: data.path, token: data.token };
}

// 4. CREATE REVIEW
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
    const photoUrl = await readReviewPhoto(formData, user.id);

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

// 5. UPDATE REVIEW
export async function updateReview(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [existing] = await db.select().from(review).where(and(eq(review.id, id), eq(review.hikerId, user.id)));
  if (!existing) throw new Error("Review not found or not owned by you.");
  const fields = readReviewFields(formData);
  const photoUrl = await readReviewPhoto(formData, user.id);
  const updateFields: Partial<typeof review.$inferInsert> = { ...fields };
  if (photoUrl) updateFields.photo = photoUrl;

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

// 6. DELETE REVIEW
export async function deleteReview(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const [existing] = await db.select().from(review).where(and(eq(review.id, id), eq(review.hikerId, user.id)));
  if (!existing) throw new Error("Review not found or not owned by you.");

  if (existing?.photo) {
    const filePath = existing.photo.split(`/${REVIEW_PHOTO_BUCKET}/`).pop();
    if (filePath) {
      const { error } = await supabase.storage.from(REVIEW_PHOTO_BUCKET).remove([filePath]);
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

async function readReviewPhoto(formData: FormData, hikerId: string) {
  const path = formData.get("photoPath");
  if (path === null || path === "") return null;
  if (typeof path !== "string" || !isOwnedReviewPhotoPath(path, hikerId)) {
    throw new ReviewValidationError("Invalid photo upload. Please try adding the photo again.");
  }
  const uploaded = await db.execute(
    sql`select 1 from storage.objects where bucket_id = ${REVIEW_PHOTO_BUCKET} and name = ${path} limit 1`,
  );
  if (uploaded.length === 0) {
    throw new ReviewValidationError("Your photo did not finish uploading. Please try again.");
  }
  const supabase = await createClient();
  return supabase.storage.from(REVIEW_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function readReviewFields(formData: FormData) {
  function text(name: string, max: number) {
    const value = formData.get(name);

    if (typeof value !== "string" || value.length > max) {
      throw new ReviewValidationError(
        `Invalid ${name}; maximum length is ${max} characters.`
      );
    }

    return value.trim();
  }

  const title = text("title", 255);
  const rating = text("rating", 4);
  const condition = text("condition", 255);
  const tags = text("tags", 255);
  const comments = text("comments", 500);
  const hikeDate = text("hikeDate", 10);

  if (!title) {
    throw new ReviewValidationError(
      "Please enter a title for your review."
    );
  }

  if (!/^[1-5]$/.test(rating)) {
    throw new ReviewValidationError(
      "Please rate the trail from 1 to 5."
    );
  }

  if (!["good", "mild", "bad"].includes(condition)) {
    throw new ReviewValidationError(
      "Please specify the trail condition."
    );
  }

  if (!hikeDate) {
    throw new ReviewValidationError(
      "Please select the date you completed this hike."
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(hikeDate)) {
    throw new ReviewValidationError(
      "Please enter a valid hike date."
    );
  }

  const [year, month, day] = hikeDate.split("-").map(Number);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  if (!isValidDate) {
    throw new ReviewValidationError(
      "Please enter a valid hike date."
    );
  }

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (hikeDate > todayString) {
    throw new ReviewValidationError(
      "The hike date cannot be in the future."
    );
  }

  return {
    title,
    rating,
    condition,
    tags,
    comments,
    hikeDate,
  };
}